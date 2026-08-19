import { actionValueFor } from "./action-value.ts";
import { createRng } from "./rng.ts";
import type {
  AbilitySet,
  Character,
  CharacterId,
  GameState,
  PlayerSlot,
  PlayerState,
  SquadSlot,
  Stats,
} from "./types.ts";
import { SQUAD_SIZE } from "./types.ts";
import { CONTENT_VERSION, SIM_VERSION } from "./version.ts";

/**
 * How large the shared pool starts and how large it can grow.
 *
 * This is a provisional number, not a balanced one. It lives here rather than
 * in a character because it belongs to the squad, and it moves into the
 * content pack as soon as that pack exists.
 */
export const DEFAULT_MAX_SHARED_ESSENCE = 5;

/** One character as they enter a match, before anything has happened. */
export interface SquadMember {
  readonly id: CharacterId;
  readonly stats: Stats;
  /** Zero for a character who pays in something other than Essence. */
  readonly maxEssence: number;
  readonly abilities: AbilitySet;
}

/** Everything needed to begin a match. */
export interface MatchOptions {
  readonly matchId: string;
  readonly seed: number;
  /** Two squads, front of the line first. Each holds exactly four members. */
  readonly squads: readonly [readonly SquadMember[], readonly SquadMember[]];
  /**
   * The version of the content these squads came from.
   *
   * The sim cannot read this off the characters: it depends on nothing, and a
   * content pack depends on it, so the arrow only points one way. The caller
   * knows which pack it loaded and says so, and the match records it for the
   * replay that outlives the next rebalance.
   */
  readonly contentVersion?: string;
}

function buildSquad(
  members: readonly SquadMember[],
  owner: PlayerSlot,
): Character[] {
  if (members.length !== SQUAD_SIZE) {
    throw new RangeError(
      `A squad holds exactly ${SQUAD_SIZE} characters, and player ${owner} brought ${members.length}.`,
    );
  }

  return members.map((member, index) => ({
    id: member.id,
    owner,
    slot: index as SquadSlot,
    stats: member.stats,
    hp: member.stats.maxHp,
    essence: 0,
    maxEssence: member.maxEssence,
    abilities: member.abilities,
    // Every character starts one full distance from their first turn, so the
    // opening order is decided by speed alone rather than by who was built
    // first.
    actionValue: actionValueFor(member.stats.speed),
  }));
}

/** Build the state a match starts from. */
export function createMatch(options: MatchOptions): GameState {
  const characters = [
    ...buildSquad(options.squads[0], 0),
    ...buildSquad(options.squads[1], 1),
  ];

  const seen = new Set<CharacterId>();
  for (const character of characters) {
    if (seen.has(character.id)) {
      throw new Error(
        `Two characters in one match share the id ${character.id}, and a command names the character it acts on by id.`,
      );
    }
    seen.add(character.id);
  }

  const player: PlayerState = {
    sharedEssence: 0,
    maxSharedEssence: DEFAULT_MAX_SHARED_ESSENCE,
    lastActionOrdinal: -1,
  };

  return {
    simVersion: SIM_VERSION,
    contentVersion: options.contentVersion ?? CONTENT_VERSION,
    matchId: options.matchId,
    rng: createRng(options.seed),
    actionOrdinal: 0,
    characters,
    players: [player, player],
    outcome: { kind: "playing" },
  };
}
