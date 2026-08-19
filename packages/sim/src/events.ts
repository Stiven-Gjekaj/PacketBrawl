import type { AbilitySlot } from "./ability.ts";
import type { CharacterId, GameState, PlayerSlot } from "./types.ts";

/**
 * What happened when a command resolved.
 *
 * A state says what is true now. It does not say what just occurred, and the
 * difference is not cosmetic: a critical hit and an ordinary large hit leave
 * exactly the same HP behind, so no comparison of two states can tell them
 * apart. `strike` knows, and without this it would throw that away.
 *
 * So the rules report as well as resolve. Everything a reader needs to
 * describe a turn is here, in the order it happened, and nothing here is
 * derived from comparing one state against another.
 *
 * These events are NOT part of the state and never reach `hash`. A match is
 * its commands, and the events are what those commands are read to mean. If
 * they were hashed, changing the wording of a report would invalidate every
 * recorded match.
 */
export type MatchEvent =
  /** Somebody spent their turn. `ability` is null when the turn was a wait. */
  | {
      readonly kind: "acted";
      readonly ordinal: number;
      readonly character: CharacterId;
      readonly action: AbilitySlot | "wait";
      readonly ability: string | null;
    }
  /** One target took damage. `critical` cannot be recovered from the state. */
  | {
      readonly kind: "hit";
      readonly source: CharacterId;
      readonly target: CharacterId;
      readonly damage: number;
      readonly critical: boolean;
    }
  /** A character reached zero HP on this action. */
  | {
      readonly kind: "fell";
      readonly character: CharacterId;
    }
  /** A basic put something into the squad's shared pool. */
  | {
      readonly kind: "sharedGained";
      readonly player: PlayerSlot;
      readonly amount: number;
    }
  /** The match ended. `winner` is null when both squads emptied at once. */
  | {
      readonly kind: "decided";
      readonly winner: PlayerSlot | null;
    };

/** A resolved state, beside the account of how it was reached. */
export interface ResolveResult {
  readonly state: GameState;
  readonly events: readonly MatchEvent[];
}
