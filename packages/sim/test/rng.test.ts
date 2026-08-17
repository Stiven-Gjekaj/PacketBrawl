import { describe, expect, it } from "vitest";
import { createRng, nextInt, nextUint32 } from "../src/rng.ts";

/** Draw `count` raw values, and give back the values alone. */
function drawMany(seed: number, count: number): number[] {
  let rng = createRng(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const draw = nextUint32(rng);
    rng = draw.rng;
    values.push(draw.value);
  }
  return values;
}

describe("createRng", () => {
  it("refuses a seed that is not a whole number", () => {
    expect(() => createRng(1.5)).toThrow(TypeError);
    expect(() => createRng(Number.NaN)).toThrow(TypeError);
  });

  it("treats a negative seed as its unsigned bit pattern", () => {
    expect(createRng(-1).state).toBe(4294967295);
  });
});

describe("nextUint32", () => {
  it("gives the same values for the same seed", () => {
    expect(drawMany(99, 20)).toEqual(drawMany(99, 20));
  });

  it("gives different values for different seeds", () => {
    expect(drawMany(1, 10)).not.toEqual(drawMany(2, 10));
  });

  it("leaves the generator it was given untouched", () => {
    const rng = createRng(42);
    const first = nextUint32(rng);
    const second = nextUint32(rng);

    // Both draws read the same generator, so both give the same value. This
    // is the property that lets a state be resolved twice without the second
    // run seeing a different number from the first.
    expect(first.value).toBe(second.value);
    expect(rng.state).toBe(42);
  });

  it("stays inside 32 unsigned bits", () => {
    for (const value of drawMany(2024, 500)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(4294967295);
    }
  });

  // These numbers are recorded from this implementation, not derived from a
  // definition. They exist so that a change to the generator cannot pass
  // quietly. A stored match replays through this stream, so changing it
  // invalidates every match recorded before the change, and that has to be a
  // decision somebody makes rather than a side effect of a refactor.
  it("produces the recorded stream", () => {
    expect(drawMany(1, 5)).toEqual([
      2693262067, 11749833, 2265367787, 4213581821, 4159151403,
    ]);
    expect(drawMany(12345, 5)).toEqual([
      4207900869, 1317490944, 2079646450, 3513001552, 2187978186,
    ]);
  });
});

describe("nextInt", () => {
  it("refuses a bound that cannot produce a value", () => {
    const rng = createRng(1);
    expect(() => nextInt(rng, 0)).toThrow(RangeError);
    expect(() => nextInt(rng, -3)).toThrow(RangeError);
    expect(() => nextInt(rng, 2.5)).toThrow(RangeError);
    expect(() => nextInt(rng, 2 ** 32 + 1)).toThrow(RangeError);
  });

  it("always gives the only value a bound of one allows", () => {
    let rng = createRng(5);
    for (let i = 0; i < 50; i += 1) {
      const draw = nextInt(rng, 1);
      rng = draw.rng;
      expect(draw.value).toBe(0);
    }
  });

  it("stays inside the bound", () => {
    let rng = createRng(808);
    for (let i = 0; i < 1000; i += 1) {
      const draw = nextInt(rng, 20);
      rng = draw.rng;
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(20);
    }
  });

  it("reaches every value of a bound it does not divide evenly", () => {
    // 2^32 does not divide by 6, so this is the case where taking the
    // remainder alone would favour the low values.
    const counts = new Map<number, number>();
    let rng = createRng(31337);
    const rolls = 60_000;
    for (let i = 0; i < rolls; i += 1) {
      const draw = nextInt(rng, 6);
      rng = draw.rng;
      counts.set(draw.value, (counts.get(draw.value) ?? 0) + 1);
    }

    expect([...counts.keys()].sort()).toEqual([0, 1, 2, 3, 4, 5]);

    // A fair die over 60000 rolls sits near 10000 a face. The seed is fixed,
    // so this test cannot become flaky; it fails only if the distribution
    // itself changes.
    for (const face of [0, 1, 2, 3, 4, 5]) {
      expect(counts.get(face)).toBeGreaterThan(9500);
      expect(counts.get(face)).toBeLessThan(10500);
    }
  });

  it("produces the recorded rolls", () => {
    let rng = createRng(7);
    const rolls: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const draw = nextInt(rng, 6);
      rng = draw.rng;
      rolls.push(draw.value);
    }
    expect(rolls).toEqual([4, 2, 2, 2, 3, 2, 1, 5]);
  });
});
