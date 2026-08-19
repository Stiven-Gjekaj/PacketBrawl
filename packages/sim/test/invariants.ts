import {
  type Character,
  type GameState,
  isAlive,
  legalMoves,
  outcomeFor,
} from "../src/index.ts";

/**
 * The things that must be true of every state, whatever happened to reach it.
 *
 * A fuzzer that only asserts "it did not throw" catches a crash and nothing
 * else. Most of the ways a rules engine goes wrong are quiet: HP below zero,
 * a pool over its ceiling, a match that says it is running with nobody left
 * to run it. These are the questions worth asking after every single command.
 *
 * Each failure names the state's hash, so a report can be reproduced from the
 * seed rather than described.
 */

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantError";
  }
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/** Everything that must hold of one state on its own. */
export function checkState(state: GameState, where: string): void {
  const at = `${where} (ordinal ${state.actionOrdinal})`;

  check(state.characters.length === 8, `${at}: squad size changed`);

  const ids = new Set(state.characters.map((one) => one.id));
  check(ids.size === 8, `${at}: two characters share an id`);

  for (const one of state.characters) {
    check(one.hp >= 0, `${at}: ${one.id} has ${one.hp} HP, below zero`);
    check(
      one.hp <= one.stats.maxHp,
      `${at}: ${one.id} has ${one.hp} of ${one.stats.maxHp} HP, above its ceiling`,
    );
    check(one.essence >= 0, `${at}: ${one.id} has negative Essence`);
    check(
      one.essence <= one.maxEssence,
      `${at}: ${one.id} holds ${one.essence} Essence over a ceiling of ${one.maxEssence}`,
    );
    check(
      one.actionValue >= 0,
      `${at}: ${one.id} is ${one.actionValue} from its turn, which is behind it`,
    );
  }

  for (const slot of [0, 1] as const) {
    const player = state.players[slot];
    check(
      player.sharedEssence >= 0,
      `${at}: player ${slot} has a negative shared pool`,
    );
    check(
      player.sharedEssence <= player.maxSharedEssence,
      `${at}: player ${slot} holds ${player.sharedEssence} shared over a ceiling of ${player.maxSharedEssence}`,
    );
  }

  // The outcome is derived, so it must agree with what it was derived from.
  const expected = outcomeFor(state.characters);
  check(
    JSON.stringify(state.outcome) === JSON.stringify(expected),
    `${at}: outcome says ${JSON.stringify(state.outcome)} but the squads say ${JSON.stringify(expected)}`,
  );

  // A finished match offers nobody a move. Without this a client could be
  // handed an action after the match it belongs to has ended.
  if (state.outcome.kind === "decided") {
    check(
      legalMoves(state, 0).length === 0 && legalMoves(state, 1).length === 0,
      `${at}: the match is decided and still offering moves`,
    );
  }
}

/** Everything that must hold between one state and the next. */
export function checkStep(
  before: GameState,
  after: GameState,
  where: string,
): void {
  const at = `${where} (${before.actionOrdinal} -> ${after.actionOrdinal})`;

  check(
    after.actionOrdinal === before.actionOrdinal + 1,
    `${at}: one command moved the ordinal by ${after.actionOrdinal - before.actionOrdinal}`,
  );
  check(after.matchId === before.matchId, `${at}: the match changed identity`);

  const was = new Map<string, Character>(
    before.characters.map((one) => [one.id, one]),
  );
  for (const now of after.characters) {
    const then = was.get(now.id);
    check(then !== undefined, `${at}: ${now.id} appeared mid match`);
    if (then === undefined) continue;

    check(
      now.owner === then.owner && now.slot === then.slot,
      `${at}: ${now.id} moved side or slot`,
    );

    // The dead stay dead. Nothing heals yet, but this is the invariant that
    // catches a healing ability written without a floor, and it costs nothing
    // to assert until then.
    if (!isAlive(then)) {
      check(!isAlive(now), `${at}: ${now.id} came back from zero HP`);
    }
  }

  // A decided match is final. It cannot resume.
  if (before.outcome.kind === "decided") {
    check(
      after.outcome.kind === "decided",
      `${at}: a decided match started playing again`,
    );
  }
}
