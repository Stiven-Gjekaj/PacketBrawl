import type { Ability, MatchOptions, SquadMember, Stats } from "@packetbrawl/sim";

/**
 * Placeholder squads.
 *
 * These are NOT Soultale characters. The spoiler policy is not decided, so
 * inventing names from the story would either leak it or have to be thrown
 * away. These exist to make the rules playable and nothing more, and
 * `packages/content` replaces them wholesale when the real cast is settled.
 *
 * They are still chosen rather than random. Between them they exercise every
 * rule the sim has: a blast, an all-target soul, a magic school attacker, and
 * a character with no Soul Essence at all who pays for everything in blood.
 */

function stats(over: Partial<Stats>): Stats {
  return {
    maxHp: 100,
    attack: 100,
    defence: 60,
    magicAttack: 100,
    magicDefence: 60,
    speed: 100,
    critRate: 10,
    critDamage: 50,
    ...over,
  };
}

function ability(over: Partial<Ability> & Pick<Ability, "id" | "name">): Ability {
  return {
    slot: "skill",
    cost: {},
    target: "single",
    school: "physical",
    power: 100,
    ...over,
  };
}

const BASIC = (id: string, name: string, school: Ability["school"] = "physical") =>
  ability({ id, name, slot: "basic", power: 55, school });

export const PLACEHOLDER_SQUADS: MatchOptions["squads"] = [
  [
    {
      id: "WARDEN",
      maxEssence: 3,
      stats: stats({ maxHp: 180, defence: 110, speed: 92, critRate: 5 }),
      abilities: {
        basic: BASIC("warden-basic", "Guard Break"),
        skill: ability({
          id: "warden-skill",
          name: "Bulwark",
          cost: { shared: 1 },
          target: "blast",
          power: 90,
        }),
        soul: ability({
          id: "warden-soul",
          name: "Last Wall",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          power: 110,
        }),
      },
    },
    {
      id: "EMBER",
      maxEssence: 3,
      stats: stats({ maxHp: 80, magicAttack: 145, defence: 30, speed: 118 }),
      abilities: {
        basic: BASIC("ember-basic", "Cinderfall", "magic"),
        skill: ability({
          id: "ember-skill",
          name: "Kindle",
          cost: { shared: 1 },
          school: "magic",
          power: 150,
        }),
        soul: ability({
          id: "ember-soul",
          name: "Ashfall",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          school: "magic",
          power: 130,
        }),
      },
    },
    {
      id: "THORN",
      maxEssence: 3,
      stats: stats({ maxHp: 100, attack: 125, speed: 164, critRate: 25 }),
      abilities: {
        basic: BASIC("thorn-basic", "Cut"),
        skill: ability({
          id: "thorn-skill",
          name: "Thornfall",
          cost: { shared: 1 },
          target: "blast",
          power: 140,
        }),
        soul: ability({
          id: "thorn-soul",
          name: "Briarheart",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          power: 120,
        }),
      },
    },
    {
      // No Soul Essence at all. Every ability is priced in blood instead, and
      // the rules need no special case for it: gainEssence caps at maxEssence,
      // so a ceiling of zero simply never fills.
      id: "VEIL",
      maxEssence: 0,
      stats: stats({ maxHp: 140, attack: 130, speed: 70, critRate: 15 }),
      abilities: {
        basic: BASIC("veil-basic", "Nightfall"),
        skill: ability({
          id: "veil-skill",
          name: "Bloodletting",
          cost: { hp: 14 },
          power: 165,
        }),
        soul: ability({
          id: "veil-soul",
          name: "The Long Dark",
          slot: "soul",
          cost: { hp: 38 },
          target: "all",
          power: 145,
        }),
      },
    },
  ],
  [
    {
      id: "CINDER",
      maxEssence: 3,
      stats: stats({ maxHp: 120, attack: 110, speed: 80 }),
      abilities: {
        basic: BASIC("cinder-basic", "Scorch", "magic"),
        skill: ability({
          id: "cinder-skill",
          name: "Emberwake",
          cost: { shared: 1 },
          school: "magic",
          power: 135,
        }),
        soul: ability({
          id: "cinder-soul",
          name: "Pyre",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          school: "magic",
          power: 125,
        }),
      },
    },
    {
      id: "HOLLOW",
      maxEssence: 3,
      stats: stats({ maxHp: 100, defence: 90, speed: 88 }),
      abilities: {
        basic: BASIC("hollow-basic", "Rend"),
        skill: ability({
          id: "hollow-skill",
          name: "Hollowing",
          cost: { shared: 1 },
          target: "blast",
          power: 95,
        }),
        soul: ability({
          id: "hollow-soul",
          name: "The Empty Hour",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          power: 115,
        }),
      },
    },
    {
      id: "MARROW",
      maxEssence: 3,
      stats: stats({ maxHp: 140, attack: 120, defence: 80, speed: 130 }),
      abilities: {
        basic: BASIC("marrow-basic", "Splinter"),
        skill: ability({
          id: "marrow-skill",
          name: "Gravebind",
          cost: { shared: 1 },
          target: "blast",
          power: 120,
        }),
        soul: ability({
          id: "marrow-soul",
          name: "Boneyard",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          power: 118,
        }),
      },
    },
    {
      id: "GLASS",
      maxEssence: 3,
      stats: stats({ maxHp: 90, attack: 135, defence: 25, speed: 151, critRate: 30, critDamage: 70 }),
      abilities: {
        basic: BASIC("glass-basic", "Shard"),
        skill: ability({
          id: "glass-skill",
          name: "Shatterstep",
          cost: { shared: 1 },
          power: 155,
        }),
        soul: ability({
          id: "glass-soul",
          name: "Killing Light",
          slot: "soul",
          cost: { essence: 3 },
          target: "all",
          power: 128,
        }),
      },
    },
  ],
] as const satisfies MatchOptions["squads"];

/** The options a hotseat match begins from. */
export function placeholderMatch(seed: number): MatchOptions {
  return { matchId: "hotseat", seed, squads: PLACEHOLDER_SQUADS };
}

/** A member by id, for anything that needs a name or an ability list. */
export function memberOf(id: string): SquadMember | undefined {
  return [...PLACEHOLDER_SQUADS[0], ...PLACEHOLDER_SQUADS[1]].find(
    (one) => one.id === id,
  );
}
