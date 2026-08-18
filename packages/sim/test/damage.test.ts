import { describe, expect, it } from "vitest";
import {
  defenceOf,
  MITIGATION_CONSTANT,
  mitigate,
  offenceOf,
  rawDamage,
  strike,
} from "../src/damage.ts";
import { createRng } from "../src/rng.ts";
import type { Character, Stats } from "../src/types.ts";

function stats(over: Partial<Stats> = {}): Stats {
  return {
    maxHp: 100,
    attack: 100,
    defence: 0,
    magicAttack: 100,
    magicDefence: 0,
    speed: 100,
    critRate: 0,
    critDamage: 50,
    ...over,
  };
}

function character(id: string, over: Partial<Stats> = {}): Character {
  return {
    id,
    owner: 0,
    slot: 0,
    stats: stats(over),
    hp: 100,
    essence: 0,
    maxEssence: 3,
    actionValue: 100_000,
  };
}

describe("offenceOf and defenceOf", () => {
  it("reads the physical pair for a physical hit", () => {
    const s = stats({
      attack: 11,
      magicAttack: 22,
      defence: 33,
      magicDefence: 44,
    });
    expect(offenceOf(s, "physical")).toBe(11);
    expect(defenceOf(s, "physical")).toBe(33);
  });

  it("reads the magic pair for a magic hit", () => {
    const s = stats({
      attack: 11,
      magicAttack: 22,
      defence: 33,
      magicDefence: 44,
    });
    expect(offenceOf(s, "magic")).toBe(22);
    expect(defenceOf(s, "magic")).toBe(44);
  });
});

describe("rawDamage", () => {
  it("reads power as a percentage of the attacking stat", () => {
    expect(rawDamage(stats({ attack: 100 }), "physical", 100)).toBe(100);
    expect(rawDamage(stats({ attack: 100 }), "physical", 50)).toBe(50);
    expect(rawDamage(stats({ attack: 200 }), "physical", 50)).toBe(100);
  });

  it("refuses a power that is not a whole number of zero or more", () => {
    expect(() => rawDamage(stats(), "physical", -1)).toThrow(RangeError);
    expect(() => rawDamage(stats(), "physical", 1.5)).toThrow(RangeError);
  });
});

describe("mitigate", () => {
  // These are the numbers the curve promises, checked rather than described.
  it("follows the curve the constant sets", () => {
    expect(mitigate(100, 0)).toBe(100);
    expect(mitigate(100, 100)).toBe(66);
    expect(mitigate(100, MITIGATION_CONSTANT)).toBe(50);
    expect(mitigate(100, 400)).toBe(33);
  });

  it("halves a hit when defence equals the constant", () => {
    expect(mitigate(1000, MITIGATION_CONSTANT)).toBe(500);
  });

  // The reason this formula was chosen over attack minus defence. However
  // high defence goes, something still gets through, so no character can
  // become unkillable by stacking one stat.
  it("never reduces a hit to nothing, however high defence goes", () => {
    for (const defence of [1_000, 100_000, 10_000_000]) {
      expect(mitigate(1_000_000, defence)).toBeGreaterThan(0);
    }
  });

  it("refuses a negative defence", () => {
    expect(() => mitigate(100, -1)).toThrow(RangeError);
  });
});

describe("strike", () => {
  it("takes at least one HP from a hit that lands", () => {
    // A tiny hit against enormous defence still costs the defender something.
    const hit = strike(
      createRng(1),
      character("a", { attack: 1 }),
      character("b", { defence: 100_000 }),
      "physical",
      1,
    );
    expect(hit.damage).toBe(1);
  });

  it("gives the same hit for the same generator", () => {
    const args = [
      character("a", { critRate: 50 }),
      character("b"),
      "physical",
      100,
    ] as const;
    const first = strike(createRng(7), ...args);
    const second = strike(createRng(7), ...args);
    expect(first.damage).toBe(second.damage);
    expect(first.critical).toBe(second.critical);
  });

  it("moves the generator on, so two hits in a row can differ", () => {
    const attacker = character("a", { critRate: 50 });
    const defender = character("b");
    const first = strike(createRng(3), attacker, defender, "physical", 100);
    const second = strike(first.rng, attacker, defender, "physical", 100);
    expect(second.rng.state).not.toBe(first.rng.state);
  });

  it("never crits at a rate of zero", () => {
    let rng = createRng(11);
    for (let i = 0; i < 200; i += 1) {
      const hit = strike(
        rng,
        character("a", { critRate: 0 }),
        character("b"),
        "physical",
        100,
      );
      rng = hit.rng;
      expect(hit.critical).toBe(false);
    }
  });

  it("always crits at a rate of one hundred", () => {
    let rng = createRng(12);
    for (let i = 0; i < 200; i += 1) {
      const hit = strike(
        rng,
        character("a", { critRate: 100 }),
        character("b"),
        "physical",
        100,
      );
      rng = hit.rng;
      expect(hit.critical).toBe(true);
    }
  });

  it("adds what crit damage says a critical adds", () => {
    const plain = strike(
      createRng(5),
      character("a", { critRate: 0 }),
      character("b"),
      "physical",
      100,
    );
    const crit = strike(
      createRng(5),
      character("a", { critRate: 100, critDamage: 50 }),
      character("b"),
      "physical",
      100,
    );
    expect(plain.damage).toBe(100);
    expect(crit.damage).toBe(150);
  });

  it("crits near the rate it is given over many rolls", () => {
    let rng = createRng(2024);
    let crits = 0;
    const rolls = 20_000;
    for (let i = 0; i < rolls; i += 1) {
      const hit = strike(
        rng,
        character("a", { critRate: 25 }),
        character("b"),
        "physical",
        100,
      );
      rng = hit.rng;
      if (hit.critical) crits += 1;
    }
    // The seed is fixed, so this cannot become flaky. It fails only if the
    // rate stops meaning a percentage.
    expect(crits / rolls).toBeGreaterThan(0.24);
    expect(crits / rolls).toBeLessThan(0.26);
  });
});
