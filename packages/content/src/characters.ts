import {
  type Ability,
  digest,
  type MatchOptions,
  type SquadMember,
  type Stats,
} from "@packetbrawl/sim";

/**
 * Eight characters from Soultale.
 *
 * WHAT IS ALLOWED IN HERE
 *
 * Published chapters only, and no plot. A soul, a fighting style and a name
 * are what a reader already has; an event, a death or a turn is not, and the
 * game is read by people who are behind on the story.
 *
 * So every entry cites the chapter its soul and its style come from, and says
 * nothing about what happens to anybody. The names of the abilities describe
 * the soul rather than the story.
 *
 * WHY THESE EIGHT
 *
 * They are the eight the published chapters name most often, which is a rule
 * rather than a preference. Their souls also happen to cover the mechanics
 * the engine has: armour, barriers, poison, thorns, starlight, time, fire,
 * and a copier who pays in himself.
 *
 * The two squads are a pairing for play, not a faction from the story. Six of
 * these eight share an affiliation on the page, and splitting them four and
 * four here says nothing about that.
 */

/** A character as the content pack describes them, before a match starts. */
export interface Fighter extends SquadMember {
  /** Their soul, quoted from the archive entry. */
  readonly soul: string;
  /** The chapters this entry was drawn from. */
  readonly sources: readonly string[];
}

function stats(over: Partial<Stats>): Stats {
  return {
    maxHp: 120,
    attack: 100,
    defence: 90,
    magicAttack: 100,
    magicDefence: 90,
    speed: 100,
    critRate: 10,
    critDamage: 50,
    ...over,
  };
}

function ability(
  id: string,
  name: string,
  over: Partial<Ability> = {},
): Ability {
  return {
    id,
    name,
    slot: "skill",
    cost: {},
    target: "single",
    school: "physical",
    power: 100,
    ...over,
  };
}

const SKILL_COST = { shared: 1 } as const;
const SOUL_COST = { essence: 3 } as const;

export const CAST: readonly Fighter[] = [
  {
    // "obsidian, crystallised out of magma and ice". His power forms around
    // his fists, and by ch. 145 the armour is permanent, fused to his skin.
    id: "Alexander",
    soul: "obsidian, crystallised out of magma and ice",
    sources: ["ch. 102", "ch. 145"],
    maxEssence: 3,
    stats: stats({
      maxHp: 190,
      attack: 130,
      defence: 145,
      magicAttack: 40,
      magicDefence: 75,
      speed: 88,
      critRate: 10,
    }),
    abilities: {
      basic: ability("alexander-basic", "Obsidian Fist", {
        slot: "basic",
        power: 60,
      }),
      skill: ability("alexander-skill", "Fused Guard", {
        cost: SKILL_COST,
        target: "blast",
        power: 105,
      }),
      soul: ability("alexander-soul", "Magma and Ice", {
        slot: "soul",
        cost: SOUL_COST,
        target: "all",
        power: 125,
      }),
    },
  },
  {
    // "barriers". Johann's own list of what he had copied names them:
    // "Noel's defensive barriers used offensively" (ch. 120).
    id: "Noel",
    soul: "barriers",
    sources: ["ch. 104", "ch. 120"],
    maxEssence: 3,
    stats: stats({
      maxHp: 175,
      attack: 85,
      defence: 155,
      magicAttack: 70,
      magicDefence: 150,
      speed: 92,
      critRate: 5,
    }),
    abilities: {
      basic: ability("noel-basic", "Ward", { slot: "basic", power: 55 }),
      skill: ability("noel-skill", "Barrier Turned Outward", {
        cost: SKILL_COST,
        target: "blast",
        power: 95,
      }),
      soul: ability("noel-soul", "Bulwark", {
        slot: "soul",
        cost: SOUL_COST,
        target: "all",
        power: 110,
      }),
    },
  },
  {
    // "poison". The same list gives her speed: "Ivy's poison-speed" (ch. 120).
    id: "Ivy",
    soul: "poison",
    sources: ["ch. 104", "ch. 120"],
    maxEssence: 3,
    stats: stats({
      maxHp: 90,
      attack: 140,
      defence: 45,
      magicAttack: 95,
      magicDefence: 60,
      speed: 158,
      critRate: 25,
      critDamage: 55,
    }),
    abilities: {
      basic: ability("ivy-basic", "Nettle", { slot: "basic", power: 55 }),
      skill: ability("ivy-skill", "Poison-Speed", {
        cost: SKILL_COST,
        power: 150,
      }),
      soul: ability("ivy-soul", "Blight", {
        slot: "soul",
        cost: SOUL_COST,
        target: "all",
        power: 120,
      }),
    },
  },
  {
    // "starlight". An artist who fights with it, and whose alias on the page
    // is Cosmic Death.
    id: "Astra",
    soul: "starlight",
    sources: ["ch. 103"],
    maxEssence: 3,
    stats: stats({
      maxHp: 95,
      attack: 45,
      defence: 40,
      magicAttack: 168,
      magicDefence: 95,
      speed: 118,
      critRate: 20,
      critDamage: 60,
    }),
    abilities: {
      basic: ability("astra-basic", "Starfall", {
        slot: "basic",
        school: "magic",
        power: 60,
      }),
      skill: ability("astra-skill", "Constellation", {
        cost: SKILL_COST,
        school: "magic",
        target: "blast",
        power: 130,
      }),
      soul: ability("astra-soul", "Cosmic Death", {
        slot: "soul",
        cost: SOUL_COST,
        school: "magic",
        target: "all",
        power: 135,
      }),
    },
  },
  {
    // "Ferocity, expressed as fire". She sculpts it: walls that burn without
    // consuming, weapons of pure heat, armour of flame (ch. 25). Her alias on
    // the page is Matchstick.
    id: "Nilah",
    soul: "Ferocity, expressed as fire",
    sources: ["ch. 25"],
    maxEssence: 3,
    stats: stats({
      maxHp: 145,
      attack: 95,
      defence: 105,
      magicAttack: 155,
      magicDefence: 110,
      speed: 96,
      critRate: 20,
      critDamage: 65,
    }),
    abilities: {
      basic: ability("nilah-basic", "Ember", {
        slot: "basic",
        school: "magic",
        power: 58,
      }),
      skill: ability("nilah-skill", "Firewall", {
        cost: SKILL_COST,
        school: "magic",
        target: "blast",
        power: 120,
      }),
      soul: ability("nilah-soul", "Matchstick", {
        slot: "soul",
        cost: SOUL_COST,
        school: "magic",
        target: "all",
        power: 140,
      }),
    },
  },
  {
    // "thorns and growth".
    id: "Lisa",
    soul: "thorns and growth",
    sources: ["ch. 105"],
    maxEssence: 3,
    stats: stats({
      maxHp: 130,
      attack: 122,
      defence: 95,
      magicAttack: 110,
      magicDefence: 90,
      speed: 104,
      critRate: 12,
    }),
    abilities: {
      basic: ability("lisa-basic", "Bramble", { slot: "basic", power: 58 }),
      skill: ability("lisa-skill", "Thornfield", {
        cost: SKILL_COST,
        target: "blast",
        power: 125,
      }),
      soul: ability("lisa-soul", "Overgrowth", {
        slot: "soul",
        cost: SOUL_COST,
        target: "all",
        power: 118,
      }),
    },
  },
  {
    // "copying". Not techniques but people wholesale, "their strength, their
    // speed, their style, manifested as duplicates that fight beside him".
    //
    // He is the character with no Soul Essence, and the page gives the reason
    // rather than the rules inventing one: "You gave up pieces of your
    // humanity every time you copied someone." So every ability he has is
    // priced in HP, and a ceiling of zero means he never fills.
    id: "Johann",
    soul: "copying",
    sources: ["ch. 102", "ch. 120"],
    maxEssence: 0,
    stats: stats({
      maxHp: 165,
      attack: 118,
      defence: 88,
      magicAttack: 108,
      magicDefence: 88,
      speed: 112,
      critRate: 15,
    }),
    abilities: {
      basic: ability("johann-basic", "Mirror", { slot: "basic", power: 58 }),
      skill: ability("johann-skill", "Borrowed Strength", {
        cost: { hp: 16 },
        power: 165,
      }),
      soul: ability("johann-soul", "Wholesale", {
        slot: "soul",
        cost: { hp: 40 },
        target: "all",
        power: 150,
      }),
    },
  },
  {
    // "time". She saw it as currents, and wanted to change what was happening
    // rather than record what already had (ch. 159).
    id: "Maeve",
    soul: "time",
    sources: ["ch. 105", "ch. 159"],
    maxEssence: 3,
    stats: stats({
      maxHp: 100,
      attack: 60,
      defence: 55,
      magicAttack: 145,
      magicDefence: 118,
      speed: 146,
      critRate: 15,
      critDamage: 55,
    }),
    abilities: {
      basic: ability("maeve-basic", "Eddy", {
        slot: "basic",
        school: "magic",
        power: 56,
      }),
      skill: ability("maeve-skill", "Current", {
        cost: SKILL_COST,
        school: "magic",
        target: "blast",
        power: 118,
      }),
      soul: ability("maeve-soul", "Undertow", {
        slot: "soul",
        cost: SOUL_COST,
        school: "magic",
        target: "all",
        power: 128,
      }),
    },
  },
];

/** Everybody, by id. */
export const ROSTER: ReadonlyMap<string, Fighter> = new Map(
  CAST.map((one) => [one.id, one]),
);

/**
 * The version of this pack.
 *
 * Every match records it, so a match played before a rebalance still says
 * which numbers it was played under, and a replay that cannot match them
 * knows to refuse rather than to quietly resolve differently.
 *
 * It is derived from the content rather than typed by hand. A version somebody
 * has to remember to raise is a version that is wrong exactly when it matters.
 */
export const CONTENT_VERSION: string = digest(CAST);

const FRONT_TO_BACK: readonly [readonly string[], readonly string[]] = [
  ["Alexander", "Noel", "Ivy", "Astra"],
  ["Nilah", "Lisa", "Johann", "Maeve"],
];

function squad(ids: readonly string[]): SquadMember[] {
  return ids.map((id) => {
    const one = ROSTER.get(id);
    if (one === undefined) {
      throw new Error(`No character named ${id} in this content pack.`);
    }
    const { soul: _soul, sources: _sources, ...member } = one;
    return member;
  });
}

/** The two squads a hotseat match begins from, front of the line first. */
export function squadsOf(): MatchOptions["squads"] {
  return [squad(FRONT_TO_BACK[0]), squad(FRONT_TO_BACK[1])];
}
