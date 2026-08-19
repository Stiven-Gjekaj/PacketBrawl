/**
 * The rules of PacketBrawl.
 *
 * This package is the whole of the game's logic and it depends on nothing.
 * No React, no DOM, no Next.js, no Supabase, and no clock or random source
 * that a state does not carry. The client imports it to draw a match and to
 * show a move at once, and the server imports the same module to decide what
 * actually happened.
 *
 * If a change in here needs a React file touched, the boundary has been
 * broken. Fix the boundary rather than the symptom.
 */

export {
  type Ability,
  type AbilityCost,
  type AbilitySlot,
  charactersHit,
  costOf,
  hitsOpponents,
  type TargetShape,
} from "./ability.ts";
export {
  ACTION_VALUE_SCALE,
  actionValueFor,
  BASE_ACTION_VALUE,
  elapseToNextTurn,
  forecast,
  nextToAct,
} from "./action-value.ts";
export {
  createMatch,
  DEFAULT_MAX_SHARED_ESSENCE,
  type MatchOptions,
  type SquadMember,
} from "./create-match.ts";
export {
  defenceOf,
  MITIGATION_CONSTANT,
  mitigate,
  offenceOf,
  rawDamage,
  type School,
  strike,
} from "./damage.ts";
export type { MatchEvent, ResolveResult } from "./events.ts";
export { canonicalize, hash } from "./hash.ts";
export { replay } from "./replay.ts";
export {
  abilityAt,
  canAfford,
  ESSENCE_PER_ACTION,
  ESSENCE_PER_HIT_TAKEN,
  IllegalCommandError,
  legalMoves,
  outcomeFor,
  resolve,
  SHARED_PER_BASIC,
} from "./resolve.ts";
export {
  createRng,
  nextInt,
  nextUint32,
  type Rng,
  type RngDraw,
} from "./rng.ts";
export {
  type AbilitySet,
  type Character,
  type CharacterId,
  type Command,
  type GameState,
  isAlive,
  type MatchOutcome,
  type PlayerSlot,
  type PlayerState,
  SQUAD_SIZE,
  type SquadSlot,
  type Stats,
} from "./types.ts";
export { CONTENT_VERSION, SIM_VERSION } from "./version.ts";
