import { describe, expect, it } from "vitest";
import type { Character } from "../src/types.ts";
import { isAlive } from "../src/types.ts";
import { abilities } from "./support.ts";

function withHp(hp: number): Character {
  return {
    id: "subject",
    owner: 0,
    slot: 0,
    stats: {
      maxHp: 100,
      attack: 10,
      defence: 10,
      magicAttack: 10,
      magicDefence: 10,
      speed: 100,
      critRate: 0,
      critDamage: 50,
    },
    hp,
    essence: 0,
    maxEssence: 3,
    abilities: abilities(),
    actionValue: 100_000,
  };
}

describe("isAlive", () => {
  // Zero is the boundary the whole match ends on, so it is the value worth
  // pinning. One HP still fights, and no HP does not.
  it("counts a character with any HP left as still in the match", () => {
    expect(isAlive(withHp(1))).toBe(true);
    expect(isAlive(withHp(100))).toBe(true);
  });

  it("counts a character at zero HP as out of the match", () => {
    expect(isAlive(withHp(0))).toBe(false);
  });

  it("counts a character driven below zero as out of the match", () => {
    expect(isAlive(withHp(-25))).toBe(false);
  });
});
