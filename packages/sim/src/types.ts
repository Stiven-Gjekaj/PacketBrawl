import type { Ability, AbilitySlot } from "./ability.ts";
import type { Rng } from "./rng.ts";

/**
 * The shape of a match.
 *
 * A match is two players with four characters each. Characters act one at a
 * time, in an order that speed decides across both squads together, so a fast
 * character can act twice before a slow one acts once.
 *
 * Everything here is readonly. `resolve` builds a new state rather than
 * editing the one it was given, which is what lets the client predict a move
 * and the server resolve the same move without either standing on the other.
 */

/** Which side of the match a player is on. A match has exactly two. */
export type PlayerSlot = 0 | 1;

/**
 * Where a character stands in their squad, from the front at 0 to the back
 * at 3.
 *
 * The order is not decoration. It decides who an attack reaches and which
 * neighbours a wide attack catches beside its target.
 */
export type SquadSlot = 0 | 1 | 2 | 3;

/** The number of characters each player brings. */
export const SQUAD_SIZE = 4;

/** How a character identifies itself inside one match. */
export type CharacterId = string;

/**
 * The eight numbers a character fights with.
 *
 * attack and defence settle a physical hit. magicAttack and magicDefence
 * settle a magic one. An ability names which pair it is judged by, so all
 * four earn their place rather than one pair shadowing the other.
 *
 * Status effect stats are still absent. Nothing reads one yet, and a field
 * that nothing reads drifts out of step with the rules without any test
 * noticing.
 */
export interface Stats {
  readonly maxHp: number;
  readonly attack: number;
  readonly defence: number;
  readonly magicAttack: number;
  readonly magicDefence: number;
  readonly speed: number;
  /** The chance of a critical hit, as a percentage from 0 to 100. */
  readonly critRate: number;
  /** What a critical hit adds, as a percentage. 50 means half again. */
  readonly critDamage: number;
}

/** The three things a character can spend a turn on. */
export interface AbilitySet {
  readonly basic: Ability;
  readonly skill: Ability;
  readonly soul: Ability;
}

/** One character partway through a match. */
export interface Character {
  readonly id: CharacterId;
  readonly owner: PlayerSlot;
  readonly slot: SquadSlot;
  readonly stats: Stats;
  readonly hp: number;
  /**
   * The character's own Soul Essence, which pays for their large attack.
   * A character built around paying in HP instead may have a maximum of zero.
   */
  readonly essence: number;
  readonly maxEssence: number;
  /**
   * The three things this character can spend a turn on. They live on the
   * character rather than in a table the rules look up, so a state carries
   * everything needed to resolve it and a replay needs nothing else.
   */
  readonly abilities: AbilitySet;
  /**
   * How far this character still is from their next action. The living
   * character with the smallest value acts next. See `action-value.ts`.
   */
  readonly actionValue: number;
}

/** One player partway through a match. */
export interface PlayerState {
  /** The pool the whole squad draws on, apart from each character's own. */
  readonly sharedEssence: number;
  readonly maxSharedEssence: number;
  /**
   * Which action of the match this player took last, or -1 before they have
   * taken one. Two characters that would act at the same moment are separated
   * by this: the side that has waited longer goes first.
   */
  readonly lastActionOrdinal: number;
}

/** Whether the match is still running, and who won if it is not. */
export type MatchOutcome =
  | { readonly kind: "playing" }
  /** `winner` is null when the same action emptied both squads. */
  | { readonly kind: "decided"; readonly winner: PlayerSlot | null };

/** A whole match at one moment. */
export interface GameState {
  /** The rules this match is played under. */
  readonly simVersion: string;
  /** The characters and abilities this match reads. */
  readonly contentVersion: string;
  readonly matchId: string;
  /** The generator, carried so that the state replays exactly. */
  readonly rng: Rng;
  /** How many actions have been taken. Also breaks ties between players. */
  readonly actionOrdinal: number;
  readonly characters: readonly Character[];
  readonly players: readonly [PlayerState, PlayerState];
  readonly outcome: MatchOutcome;
}

/**
 * Something a player tells the match to do.
 *
 * `wait` gives up the action and sends the character to the back of the
 * order. `act` spends the turn on one of the character's three abilities.
 *
 * `target` is the character an ability is aimed at, and is null for a shape
 * that needs no aim. A shape that does need one and is given null reaches
 * nobody, which `legalMoves` never offers and `resolve` refuses.
 */
export type Command =
  | {
      readonly kind: "wait";
      readonly character: CharacterId;
    }
  | {
      readonly kind: "act";
      readonly character: CharacterId;
      readonly slot: AbilitySlot;
      readonly target: CharacterId | null;
    };

/** A character is out of the match when it reaches zero HP. */
export function isAlive(character: Character): boolean {
  return character.hp > 0;
}
