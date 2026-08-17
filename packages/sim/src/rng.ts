/**
 * The seeded generator every random choice in the sim draws from.
 *
 * The generator holds no hidden state. A draw takes a generator and gives back
 * a value and the next generator, so the caller decides what to keep. This is
 * what lets a state be replayed: the generator is part of the state, and two
 * runs from the same state draw the same numbers in the same order.
 *
 * `Math.random()` is refused in this package. It reads a generator the state
 * does not carry, so a match that used it could not be replayed or verified by
 * the server, and the two sides of a match would disagree.
 */

/** A position in the stream of numbers that one seed produces. */
export interface Rng {
  readonly state: number;
}

/** A drawn value beside the generator that comes after it. */
export interface RngDraw {
  readonly rng: Rng;
  readonly value: number;
}

/** Start the stream that `seed` names. */
export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed)) {
    throw new TypeError(`A seed must be a whole number, and was ${seed}.`);
  }
  return { state: seed >>> 0 };
}

/**
 * Draw the next number, from 0 up to 2^32 - 1.
 *
 * This is mulberry32. It is small, it has no dependencies, and every step is
 * 32 bit integer arithmetic, so it gives the same numbers on every engine.
 * That last property is the reason it is here. A generator that used floating
 * point could drift between a phone and the server, and the two would then
 * disagree about a match that both resolved correctly.
 */
export function nextUint32(rng: Rng): RngDraw {
  const state = (rng.state + 0x6d2b79f5) | 0;
  let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return { rng: { state: state >>> 0 }, value: (mixed ^ (mixed >>> 14)) >>> 0 };
}

/**
 * Draw a number from 0 up to `boundExclusive - 1`, with every value equally
 * likely.
 *
 * Taking the remainder alone would favour the low values, because 2^32 does
 * not divide evenly by most bounds. This throws away the draws that fall in
 * the short last block and draws again, which costs under two draws on
 * average and removes the bias completely.
 */
export function nextInt(rng: Rng, boundExclusive: number): RngDraw {
  if (!Number.isInteger(boundExclusive) || boundExclusive <= 0) {
    throw new RangeError(
      `A bound must be a whole number above zero, and was ${boundExclusive}.`,
    );
  }
  if (boundExclusive > 2 ** 32) {
    throw new RangeError(
      `A bound must be 2^32 or less, and was ${boundExclusive}.`,
    );
  }

  const unbiasedLimit = 2 ** 32 - (2 ** 32 % boundExclusive);
  let current = rng;
  for (;;) {
    const draw = nextUint32(current);
    current = draw.rng;
    if (draw.value < unbiasedLimit) {
      return { rng: current, value: draw.value % boundExclusive };
    }
  }
}
