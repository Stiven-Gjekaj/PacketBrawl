import type { CharacterId, MatchEvent, PlayerSlot } from "@packetbrawl/sim";

/**
 * Turning the sim's events into the lines the log shows.
 *
 * The sim reports atoms: one `acted`, then a `hit` for each character reached,
 * then any `fell`, then what the pool gained. A reader wants one line per
 * turn with those effects gathered onto it, so this groups them.
 *
 * It never inspects a state. Everything a line says came from the events,
 * which is the only place some of it exists at all: a critical cannot be
 * recovered from HP after the fact.
 */

export type LogEffect =
  | { readonly kind: "damage"; readonly target: CharacterId; readonly amount: number; readonly critical: boolean }
  | { readonly kind: "fell"; readonly target: CharacterId }
  | { readonly kind: "shared"; readonly amount: number }
  | { readonly kind: "decided"; readonly winner: PlayerSlot | null };

export interface LogLine {
  readonly key: string;
  readonly ordinal: number;
  readonly actor: CharacterId;
  readonly owner: PlayerSlot;
  readonly ability: string;
  readonly effects: readonly LogEffect[];
}

/**
 * Group a run of events into lines, newest last.
 *
 * An event before the first `acted` is dropped rather than guessed at. That
 * cannot happen from `resolve`, which always reports the action first, and
 * silently attaching such an event to a line that does not exist would be a
 * worse answer than none.
 */
export function toLines(
  events: readonly MatchEvent[],
  ownerOf: (id: CharacterId) => PlayerSlot,
): LogLine[] {
  const lines: LogLine[] = [];
  let effects: LogEffect[] = [];

  const close = () => {
    const open = lines.at(-1);
    if (open !== undefined && effects.length > 0) {
      lines[lines.length - 1] = { ...open, effects };
    }
    effects = [];
  };

  for (const event of events) {
    switch (event.kind) {
      case "acted":
        close();
        lines.push({
          key: `${event.ordinal}-${event.character}`,
          ordinal: event.ordinal,
          actor: event.character,
          owner: ownerOf(event.character),
          ability: event.ability ?? "waits",
          effects: [],
        });
        break;
      case "hit":
        effects.push({
          kind: "damage",
          target: event.target,
          amount: event.damage,
          critical: event.critical,
        });
        break;
      case "fell":
        effects.push({ kind: "fell", target: event.character });
        break;
      case "sharedGained":
        effects.push({ kind: "shared", amount: event.amount });
        break;
      case "decided":
        effects.push({ kind: "decided", winner: event.winner });
        break;
    }
  }
  close();
  return lines;
}

/** Keep only the most recent `count` lines, which is all a band can show. */
export function tail(lines: readonly LogLine[], count: number): LogLine[] {
  return lines.slice(Math.max(0, lines.length - count));
}
