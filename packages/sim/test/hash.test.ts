import { describe, expect, it } from "vitest";
import { createMatch } from "../src/create-match.ts";
import { canonicalize, hash } from "../src/hash.ts";
import type { GameState, Stats } from "../src/types.ts";

function stats(speed: number): Stats {
  return {
    maxHp: 100,
    attack: 10,
    defence: 10,
    magicAttack: 10,
    magicDefence: 10,
    speed,
  };
}

function match(): GameState {
  const squad = (prefix: string, leadSpeed: number) =>
    [0, 1, 2, 3].map((index) => ({
      id: `${prefix}${index}`,
      stats: stats(index === 0 ? leadSpeed : 100),
      maxEssence: 3,
    }));

  return createMatch({
    matchId: "m1",
    seed: 42,
    squads: [squad("a", 150), squad("b", 120)],
  });
}

describe("canonicalize", () => {
  it("writes the same text whatever order the fields were built in", () => {
    const built = { alpha: 1, beta: 2, gamma: 3 };
    const spread = { gamma: 3, alpha: 1, beta: 2 };
    expect(canonicalize(built)).toBe(canonicalize(spread));
  });

  it("sorts the keys of a nested object too", () => {
    expect(canonicalize({ outer: { z: 1, a: 2 } })).toBe(
      canonicalize({ outer: { a: 2, z: 1 } }),
    );
  });

  it("keeps the order of an array, which carries meaning", () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it("tells an absent field from one holding undefined", () => {
    expect(canonicalize({ a: 1 })).not.toBe(
      canonicalize({ a: 1, b: undefined }),
    );
  });

  it("tells negative zero from zero", () => {
    // String(-0) is "0", so without this the two states hash the same.
    expect(canonicalize(-0)).toBe("-0");
    expect(canonicalize(0)).toBe("0");
  });

  it("refuses a value a state cannot hold", () => {
    expect(() => canonicalize(() => 1)).toThrow(TypeError);
  });
});

describe("hash", () => {
  it("gives the same string for the same state", () => {
    expect(hash(match())).toBe(hash(match()));
  });

  it("gives a different string when any value changes", () => {
    const state = match();
    const moved: GameState = { ...state, actionOrdinal: 1 };
    expect(hash(moved)).not.toBe(hash(state));
  });

  it("notices a change buried inside a character", () => {
    const state = match();
    const hurt: GameState = {
      ...state,
      characters: state.characters.map((character, index) =>
        index === 0 ? { ...character, hp: character.hp - 1 } : character,
      ),
    };
    expect(hash(hurt)).not.toBe(hash(state));
  });

  it("gives sixteen hexadecimal characters", () => {
    expect(hash(match())).toMatch(/^[0-9a-f]{16}$/);
  });

  // Read from this implementation. A client and a server compare this string
  // to find a disagreement, so changing how it is computed makes every
  // recorded hash meaningless and has to be a decision rather than a slip.
  it("produces the recorded value", () => {
    expect(hash(match())).toBe("3b17aaabab30e5f8");
  });
});
