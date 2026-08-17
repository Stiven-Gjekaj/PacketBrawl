import type { Character, GameState, PlayerState } from "./types.ts";
import { isAlive } from "./types.ts";

/**
 * Who acts next, and when.
 *
 * Every character walks the same distance to reach their turn. Speed decides
 * how fast they walk, so a character with twice the speed arrives twice as
 * often. Nothing takes a turn in a fixed rotation, and nothing is owed a turn
 * because the other side just had one. This is what lets a fast character act
 * twice before a slow character acts once, which is the behaviour the game is
 * built around.
 *
 * The distance is held as a whole number rather than as 10000 divided by
 * speed. A fraction would be stored, hashed, and compared on two machines,
 * and two machines do not have to agree about the last bit of a fraction. A
 * whole number leaves nothing to disagree about.
 */

/** The distance every character covers to reach a turn. */
export const BASE_ACTION_VALUE = 10_000;

/**
 * How finely the distance is divided.
 *
 * With this multiplier a speed of 137 gives 72992 rather than 72.99, so
 * speeds that are close together still order correctly.
 */
export const ACTION_VALUE_SCALE = 1_000;

/** The distance a character of this speed covers between two of their turns. */
export function actionValueFor(speed: number): number {
  if (!Number.isInteger(speed) || speed <= 0) {
    throw new RangeError(
      `A speed must be a whole number above zero, and was ${speed}.`,
    );
  }
  return Math.floor((BASE_ACTION_VALUE * ACTION_VALUE_SCALE) / speed);
}

/**
 * Order two characters that are both ready to act.
 *
 * Distance decides first. When two characters arrive together, the side that
 * has waited longer goes first, so neither player gains a standing advantage
 * from a tie. Beyond that the front of the squad goes first, and then the
 * lower player slot, which settles the opening of a match between two squads
 * of identical speed.
 */
function compareForTurn(
  a: Character,
  b: Character,
  players: readonly [PlayerState, PlayerState],
): number {
  if (a.actionValue !== b.actionValue) {
    return a.actionValue - b.actionValue;
  }

  const aLastActed = players[a.owner].lastActionOrdinal;
  const bLastActed = players[b.owner].lastActionOrdinal;
  if (aLastActed !== bLastActed) {
    return aLastActed - bLastActed;
  }

  if (a.slot !== b.slot) {
    return a.slot - b.slot;
  }
  return a.owner - b.owner;
}

/** The living character whose turn is next, or null when none is living. */
export function nextToAct(state: GameState): Character | null {
  let soonest: Character | null = null;
  for (const character of state.characters) {
    if (!isAlive(character)) {
      continue;
    }
    if (
      soonest === null ||
      compareForTurn(character, soonest, state.players) < 0
    ) {
      soonest = character;
    }
  }
  return soonest;
}

/**
 * Move every living character forward until the next one is ready to act.
 *
 * The character that arrives sits at a distance of zero, so a reader can see
 * whose turn it is from the state alone rather than by running a comparison.
 */
export function elapseToNextTurn(
  characters: readonly Character[],
): readonly Character[] {
  let shortest = Number.POSITIVE_INFINITY;
  for (const character of characters) {
    if (isAlive(character) && character.actionValue < shortest) {
      shortest = character.actionValue;
    }
  }

  if (shortest === Number.POSITIVE_INFINITY || shortest === 0) {
    return characters;
  }

  return characters.map((character) =>
    isAlive(character)
      ? { ...character, actionValue: character.actionValue - shortest }
      : character,
  );
}

/**
 * The characters due to act, soonest first.
 *
 * This is what the sidebar shows both players. It is exact rather than an
 * estimate, because nothing acts outside this order: there is no ability that
 * interrupts, so the only thing that can change the forecast is a change to a
 * speed, and that happens on a turn the forecast already shows.
 */
export function forecast(state: GameState, count: number): Character[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `A forecast length must be a whole number of zero or more, and was ${count}.`,
    );
  }
  if (state.outcome.kind === "decided") {
    return [];
  }

  let characters: readonly Character[] = state.characters.filter(isAlive);
  if (characters.length === 0) {
    return [];
  }

  // The forecast walks a copy of the players as well, because the rule that
  // separates two characters arriving together depends on which side acted
  // last, and that changes as the forecast advances.
  let players = state.players;
  let ordinal = state.actionOrdinal;
  const upcoming: Character[] = [];

  for (let step = 0; step < count; step += 1) {
    characters = elapseToNextTurn(characters);

    let soonest: Character | null = null;
    for (const character of characters) {
      if (soonest === null || compareForTurn(character, soonest, players) < 0) {
        soonest = character;
      }
    }
    if (soonest === null) {
      break;
    }

    upcoming.push(soonest);

    const actor = soonest;
    characters = characters.map((character) =>
      character.id === actor.id
        ? {
            ...character,
            actionValue: actionValueFor(character.stats.speed),
          }
        : character,
    );

    const updated: PlayerState = {
      ...players[actor.owner],
      lastActionOrdinal: ordinal,
    };
    players = actor.owner === 0 ? [updated, players[1]] : [players[0], updated];
    ordinal += 1;
  }

  return upcoming;
}
