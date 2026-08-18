import type { School } from "./damage.ts";
import type { Character, CharacterId, SquadSlot } from "./types.ts";
import { isAlive } from "./types.ts";

/**
 * What a character can do, and what it costs them.
 *
 * An ability names its price in three currencies and may use any mix of
 * them. That is what lets two characters of the same class play nothing
 * alike without the engine knowing anything about either of them:
 *
 *   a character who pays in blood   cost: { hp: 15 }
 *   a character with no Essence     maxEssence: 0, every ability priced in hp
 *
 * Neither needs a special case. They are ordinary abilities with an unusual
 * bill.
 */

/** What an ability takes to use. Anything left out costs nothing. */
export interface AbilityCost {
  /** From the squad's shared pool. */
  readonly shared?: number;
  /** From the character's own Soul Essence. */
  readonly essence?: number;
  /** From the character's own HP. */
  readonly hp?: number;
}

/**
 * Who an ability reaches.
 *
 * `blast` is why squad order is a position rather than a label. It catches
 * the target and whoever stands either side of them, so where a character
 * stands decides what a single enemy action costs the whole squad.
 */
export type TargetShape =
  | "single"
  | "blast"
  | "all"
  | "self"
  | "ally"
  | "allAllies";

/** Which of the three actions a turn can be spent on. */
export type AbilitySlot = "basic" | "skill" | "soul";

export interface Ability {
  readonly id: string;
  readonly name: string;
  readonly slot: AbilitySlot;
  readonly cost: AbilityCost;
  readonly target: TargetShape;
  readonly school: School;
  /** The percentage of the attacking stat this hit is worth. */
  readonly power: number;
}

/** What an ability costs, with the parts it leaves out read as nothing. */
export function costOf(ability: Ability): Required<AbilityCost> {
  return {
    shared: ability.cost.shared ?? 0,
    essence: ability.cost.essence ?? 0,
    hp: ability.cost.hp ?? 0,
  };
}

/** True when an ability reaches the other squad rather than its own. */
export function hitsOpponents(ability: Ability): boolean {
  return (
    ability.target === "single" ||
    ability.target === "blast" ||
    ability.target === "all"
  );
}

/**
 * The characters an ability actually reaches.
 *
 * A dead character is never reached. `blast` reads the slots either side of
 * the target rather than the neighbours who happen to be alive, so a fallen
 * character leaves a real gap in the line instead of closing it up.
 */
export function charactersHit(
  characters: readonly Character[],
  actor: Character,
  ability: Ability,
  targetId: CharacterId | null,
): Character[] {
  const living = characters.filter(isAlive);

  switch (ability.target) {
    case "self":
      return [actor];

    case "all":
      return living.filter((one) => one.owner !== actor.owner);

    case "allAllies":
      return living.filter((one) => one.owner === actor.owner);

    case "single":
    case "ally": {
      const target = living.find((one) => one.id === targetId);
      return target === undefined ? [] : [target];
    }

    case "blast": {
      const target = living.find((one) => one.id === targetId);
      if (target === undefined) {
        return [];
      }
      const reached: SquadSlot[] = [target.slot];
      if (target.slot > 0) {
        reached.push((target.slot - 1) as SquadSlot);
      }
      if (target.slot < 3) {
        reached.push((target.slot + 1) as SquadSlot);
      }
      return living
        .filter(
          (one) => one.owner === target.owner && reached.includes(one.slot),
        )
        .sort((left, right) => left.slot - right.slot);
    }
  }
}
