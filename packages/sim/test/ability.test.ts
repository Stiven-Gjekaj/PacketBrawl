import { describe, expect, it } from "vitest";
import {
  type Ability,
  charactersHit,
  costOf,
  hitsOpponents,
} from "../src/ability.ts";
import type { Character, PlayerSlot, SquadSlot, Stats } from "../src/types.ts";
import { abilities } from "./support.ts";

const STATS: Stats = {
  maxHp: 100,
  attack: 100,
  defence: 0,
  magicAttack: 100,
  magicDefence: 0,
  speed: 100,
  critRate: 0,
  critDamage: 50,
};

function person(
  id: string,
  owner: PlayerSlot,
  slot: SquadSlot,
  hp = 100,
): Character {
  return {
    id,
    owner,
    slot,
    stats: STATS,
    hp,
    essence: 0,
    maxEssence: 3,
    abilities: abilities(),
    actionValue: 100_000,
  };
}

/** Two full squads, front of the line first. */
function squads(): Character[] {
  return [
    person("a0", 0, 0),
    person("a1", 0, 1),
    person("a2", 0, 2),
    person("a3", 0, 3),
    person("b0", 1, 0),
    person("b1", 1, 1),
    person("b2", 1, 2),
    person("b3", 1, 3),
  ];
}

function ability(over: Partial<Ability> = {}): Ability {
  return {
    id: "test",
    name: "Test",
    slot: "skill",
    cost: {},
    target: "single",
    school: "physical",
    power: 100,
    ...over,
  };
}

describe("costOf", () => {
  it("reads an unnamed part of the price as nothing", () => {
    expect(costOf(ability({ cost: {} }))).toEqual({
      shared: 0,
      essence: 0,
      hp: 0,
    });
  });

  // The two characters the design asks for, priced. Neither needs the engine
  // to know anything about them.
  it("prices a character who pays in blood", () => {
    expect(costOf(ability({ cost: { hp: 15 } }))).toEqual({
      shared: 0,
      essence: 0,
      hp: 15,
    });
  });

  it("prices an ability that costs a mix", () => {
    expect(costOf(ability({ cost: { shared: 1, essence: 3 } }))).toEqual({
      shared: 1,
      essence: 3,
      hp: 0,
    });
  });
});

describe("hitsOpponents", () => {
  it("says which shapes reach across the board", () => {
    expect(hitsOpponents(ability({ target: "single" }))).toBe(true);
    expect(hitsOpponents(ability({ target: "blast" }))).toBe(true);
    expect(hitsOpponents(ability({ target: "all" }))).toBe(true);
    expect(hitsOpponents(ability({ target: "self" }))).toBe(false);
    expect(hitsOpponents(ability({ target: "ally" }))).toBe(false);
    expect(hitsOpponents(ability({ target: "allAllies" }))).toBe(false);
  });
});

describe("charactersHit", () => {
  const actor = person("a0", 0, 0);
  const names = (list: Character[]) => list.map((one) => one.id);

  it("reaches one enemy for a single target", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "single" }),
      "b2",
    );
    expect(names(hit)).toEqual(["b2"]);
  });

  it("reaches nobody when the named target is not there", () => {
    expect(
      charactersHit(squads(), actor, ability({ target: "single" }), "nobody"),
    ).toEqual([]);
    expect(
      charactersHit(squads(), actor, ability({ target: "single" }), null),
    ).toEqual([]);
  });

  it("reaches the whole enemy squad for all", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "all" }),
      null,
    );
    expect(names(hit)).toEqual(["b0", "b1", "b2", "b3"]);
  });

  it("reaches the actor's own squad for allAllies", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "allAllies" }),
      null,
    );
    expect(names(hit)).toEqual(["a0", "a1", "a2", "a3"]);
  });

  it("reaches only the actor for self, whoever is named", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "self" }),
      "b0",
    );
    expect(names(hit)).toEqual(["a0"]);
  });

  // This is what makes squad order a position rather than a label.
  it("catches the target and both neighbours for a blast", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "blast" }),
      "b1",
    );
    expect(names(hit)).toEqual(["b0", "b1", "b2"]);
  });

  it("catches only one neighbour at the front of the line", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "blast" }),
      "b0",
    );
    expect(names(hit)).toEqual(["b0", "b1"]);
  });

  it("catches only one neighbour at the back of the line", () => {
    const hit = charactersHit(
      squads(),
      actor,
      ability({ target: "blast" }),
      "b3",
    );
    expect(names(hit)).toEqual(["b2", "b3"]);
  });

  // A fallen character leaves a gap rather than closing the line up. Standing
  // beside a casualty is therefore safer, which is a real positional
  // consequence rather than an accident of how the list is filtered.
  it("leaves a gap in the line where a character has fallen", () => {
    const withGap = squads().map((one) =>
      one.id === "b1" ? { ...one, hp: 0 } : one,
    );
    const hit = charactersHit(
      withGap,
      actor,
      ability({ target: "blast" }),
      "b2",
    );
    expect(names(hit)).toEqual(["b2", "b3"]);
  });

  it("never reaches a character who has fallen", () => {
    const withDead = squads().map((one) =>
      one.owner === 1 && one.slot < 2 ? { ...one, hp: 0 } : one,
    );
    const hit = charactersHit(
      withDead,
      actor,
      ability({ target: "all" }),
      null,
    );
    expect(names(hit)).toEqual(["b2", "b3"]);
  });
});
