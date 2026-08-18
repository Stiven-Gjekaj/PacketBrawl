import type { Ability } from "../src/ability.ts";
import type {
  AbilitySet,
  Character,
  PlayerSlot,
  SquadSlot,
  Stats,
} from "../src/types.ts";

/**
 * Neutral parts for building a state inside a test.
 *
 * Nothing here is balanced, and no test should assert a number it did not
 * set itself. A test that cares about a value overrides it and reads it back.
 * These exist so a test about turn order does not have to describe three
 * abilities it never uses.
 */

export const NEUTRAL_STATS: Stats = {
  maxHp: 100,
  attack: 100,
  defence: 0,
  magicAttack: 100,
  magicDefence: 0,
  speed: 100,
  critRate: 0,
  critDamage: 50,
};

export function stats(over: Partial<Stats> = {}): Stats {
  return { ...NEUTRAL_STATS, ...over };
}

export function ability(over: Partial<Ability> = {}): Ability {
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

/** A plain set: a free basic, a skill costing one shared, a soul costing all. */
export function abilities(over: Partial<AbilitySet> = {}): AbilitySet {
  return {
    basic: ability({ id: "basic", slot: "basic", power: 50 }),
    skill: ability({
      id: "skill",
      slot: "skill",
      cost: { shared: 1 },
      power: 100,
    }),
    soul: ability({
      id: "soul",
      slot: "soul",
      cost: { essence: 3 },
      target: "all",
      power: 120,
    }),
    ...over,
  };
}

export function person(
  id: string,
  owner: PlayerSlot,
  slot: SquadSlot,
  over: Partial<Character> = {},
): Character {
  return {
    id,
    owner,
    slot,
    stats: NEUTRAL_STATS,
    hp: 100,
    essence: 0,
    maxEssence: 3,
    abilities: abilities(),
    actionValue: 100_000,
    ...over,
  };
}
