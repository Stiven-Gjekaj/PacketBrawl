import type { GameState } from "./types.ts";

/**
 * A short string that stands for a whole state.
 *
 * Two runs of the same match must produce the same string, on a phone and on
 * the server, today and after a rebuild. That is what makes a disagreement
 * between a client and the server visible: the two compare one string rather
 * than walking two objects and hoping the walk covers everything.
 *
 * This is not a security check. It detects a mistake, not an attacker. The
 * server resolves every command itself and never trusts a client's state.
 */

/**
 * Write a value as text that depends on its contents and not on the order its
 * fields happened to be built in.
 *
 * JSON.stringify writes keys in insertion order, so two states that hold the
 * same values hash differently when one was built field by field and the
 * other by spreading an existing object. Sorting the keys removes that.
 */
export function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    // An absent field and a field set to undefined are different states, and
    // JSON.stringify erases the difference by dropping both.
    return "undefined";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      // String(-0) is "0", so negative zero needs saying out loud. NaN and
      // the infinities should never reach a state, and if one does, the hash
      // shows it rather than hiding it inside a number that reads as normal.
      return Object.is(value, -0) ? "-0" : String(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new TypeError(`A state cannot hold a ${typeof value}.`);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  );
  const written = entries.map(
    ([key, held]) => `${JSON.stringify(key)}:${canonicalize(held)}`,
  );
  return `{${written.join(",")}}`;
}

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const SIXTY_FOUR_BITS = 0xffffffffffffffffn;

/** Hash a state to sixteen hexadecimal characters. */
export function hash(state: GameState): string {
  const text = canonicalize(state);

  // Each character is folded in as its two code units, high half first.
  //
  // TextEncoder would be the obvious way to get bytes, and it is deliberately
  // not used: it is a host global, and this package is allowed to reach for
  // nothing the state does not carry. Widening the TypeScript lib far enough
  // to declare it would also declare `document`, which is the exact import
  // this package exists to refuse.
  //
  // Nothing is lost by folding code units. A JavaScript string is a sequence
  // of UTF-16 code units by specification, so charCodeAt gives the same
  // numbers on every engine.
  let digest = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    digest ^= BigInt(unit >>> 8);
    digest = (digest * FNV_PRIME) & SIXTY_FOUR_BITS;
    digest ^= BigInt(unit & 0xff);
    digest = (digest * FNV_PRIME) & SIXTY_FOUR_BITS;
  }
  return digest.toString(16).padStart(16, "0");
}
