import { actionValueFor, elapseToNextTurn, nextToAct } from "./action-value.ts";
import type {
  Character,
  Command,
  GameState,
  MatchOutcome,
  PlayerSlot,
  PlayerState,
} from "./types.ts";
import { isAlive } from "./types.ts";

/**
 * Turning a command into the next state.
 *
 * The server runs this and so does the client. One implementation of the
 * rules, never two. The client runs it to show a move at once, the server
 * runs it to decide what actually happened, and the two agree because they
 * are the same code reading the same state.
 */

/** Raised when a command is not one the state allows. */
export class IllegalCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalCommandError";
  }
}

/**
 * Who has been emptied, and so who has won.
 *
 * Exported because the draw it can report cannot yet be reached by resolving
 * commands: nothing deals damage, so no action can empty a squad. Leaving it
 * unexported would leave a branch of the win rule that no test can reach, and
 * damage lands on top of this rule rather than beside it.
 */
export function outcomeFor(characters: readonly Character[]): MatchOutcome {
  const zeroWiped = !characters.some(
    (character) => character.owner === 0 && isAlive(character),
  );
  const oneWiped = !characters.some(
    (character) => character.owner === 1 && isAlive(character),
  );

  if (zeroWiped && oneWiped) {
    // One action emptied both squads. Nothing produces this yet, but a state
    // that cannot say it happened would have to call it a win for somebody.
    return { kind: "decided", winner: null };
  }
  if (zeroWiped) {
    return { kind: "decided", winner: 1 };
  }
  if (oneWiped) {
    return { kind: "decided", winner: 0 };
  }
  return { kind: "playing" };
}

function withPlayerUpdated(
  players: readonly [PlayerState, PlayerState],
  slot: PlayerSlot,
  updated: PlayerState,
): readonly [PlayerState, PlayerState] {
  return slot === 0 ? [updated, players[1]] : [players[0], updated];
}

/**
 * The commands this player may give right now.
 *
 * A player who is not on turn has none. The server checks a command against
 * this list before resolving it, so a client that asks for something it
 * cannot have is refused rather than believed.
 */
export function legalMoves(state: GameState, player: PlayerSlot): Command[] {
  if (state.outcome.kind === "decided") {
    return [];
  }

  const actor = nextToAct(state);
  if (actor === null || actor.owner !== player) {
    return [];
  }

  return [{ kind: "wait", character: actor.id }];
}

/** Apply one command to a state, and give back the state that follows. */
function applyOne(state: GameState, command: Command): GameState {
  if (state.outcome.kind === "decided") {
    throw new IllegalCommandError(
      "The match is over, and a finished match takes no more commands.",
    );
  }

  const characters = elapseToNextTurn(state.characters);
  const elapsed: GameState = { ...state, characters };

  const actor = nextToAct(elapsed);
  if (actor === null) {
    throw new IllegalCommandError(
      "No character is able to act, so no command can be given.",
    );
  }
  if (command.character !== actor.id) {
    throw new IllegalCommandError(
      `It is the turn of ${actor.id}, and the command named ${command.character}.`,
    );
  }

  switch (command.kind) {
    case "wait": {
      // Waiting gives up the action. The character starts the walk to their
      // next turn again, which sends them to the back of the order.
      const afterAction = characters.map((character) =>
        character.id === actor.id
          ? {
              ...character,
              actionValue: actionValueFor(character.stats.speed),
            }
          : character,
      );

      return {
        ...state,
        characters: afterAction,
        players: withPlayerUpdated(state.players, actor.owner, {
          ...state.players[actor.owner],
          lastActionOrdinal: state.actionOrdinal,
        }),
        actionOrdinal: state.actionOrdinal + 1,
        outcome: outcomeFor(afterAction),
      };
    }
  }
}

/**
 * Apply commands in order, and give back the state that follows them all.
 *
 * The state given in is never edited. Nothing here reads the clock, the
 * network, or a random source the state does not carry, so the same state and
 * the same commands always produce the same result.
 */
export function resolve(
  state: GameState,
  commands: readonly Command[],
): GameState {
  let current = state;
  for (const command of commands) {
    current = applyOne(current, command);
  }
  return current;
}
