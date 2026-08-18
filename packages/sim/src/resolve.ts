import type { Ability, AbilitySlot } from "./ability.ts";
import { charactersHit, costOf, hitsOpponents } from "./ability.ts";
import { actionValueFor, elapseToNextTurn, nextToAct } from "./action-value.ts";
import { strike } from "./damage.ts";
import type { Rng } from "./rng.ts";
import type {
  Character,
  CharacterId,
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

/** What a character gains for spending a turn. */
export const ESSENCE_PER_ACTION = 1;

/** What a character gains for being hit, however hard. */
export const ESSENCE_PER_HIT_TAKEN = 1;

/** What the squad's shared pool gains when somebody spends a turn on a basic. */
export const SHARED_PER_BASIC = 1;

/** Who has been emptied, and so who has won. */
export function outcomeFor(characters: readonly Character[]): MatchOutcome {
  const zeroWiped = !characters.some(
    (character) => character.owner === 0 && isAlive(character),
  );
  const oneWiped = !characters.some(
    (character) => character.owner === 1 && isAlive(character),
  );

  if (zeroWiped && oneWiped) {
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

function gainEssence(character: Character, amount: number): Character {
  // A character with no Essence at all gains none. That is what makes a
  // character who pays only in blood work without the rules knowing it.
  const gained = Math.min(character.maxEssence, character.essence + amount);
  return { ...character, essence: gained };
}

/**
 * Whether a character can pay for an ability right now.
 *
 * An HP price must leave the character alive. Paying a cost should not be a
 * way to die, because a character who died mid-action leaves the rules
 * answering questions nobody asked: whether the ability still lands, and
 * whether a squad emptied by its own turn has lost.
 */
export function canAfford(
  state: GameState,
  character: Character,
  ability: Ability,
): boolean {
  const cost = costOf(ability);
  const player = state.players[character.owner];
  return (
    player.sharedEssence >= cost.shared &&
    character.essence >= cost.essence &&
    character.hp > cost.hp
  );
}

/** The ability a slot names on a character. */
export function abilityAt(character: Character, slot: AbilitySlot): Ability {
  return character.abilities[slot];
}

/**
 * Every command this player may give right now.
 *
 * A player not on turn has none. The server checks a command against this
 * list before resolving it, so a client that asks for something it cannot
 * have is refused rather than believed.
 */
export function legalMoves(state: GameState, player: PlayerSlot): Command[] {
  if (state.outcome.kind === "decided") {
    return [];
  }

  const actor = nextToAct(state);
  if (actor === null || actor.owner !== player) {
    return [];
  }

  const moves: Command[] = [{ kind: "wait", character: actor.id }];

  for (const slot of ["basic", "skill", "soul"] as const) {
    const ability = abilityAt(actor, slot);
    if (!canAfford(state, actor, ability)) {
      continue;
    }

    const needsTarget =
      ability.target === "single" ||
      ability.target === "blast" ||
      ability.target === "ally";

    if (!needsTarget) {
      moves.push({ kind: "act", character: actor.id, slot, target: null });
      continue;
    }

    const side = hitsOpponents(ability) ? 1 - actor.owner : actor.owner;
    for (const candidate of state.characters) {
      if (isAlive(candidate) && candidate.owner === side) {
        moves.push({
          kind: "act",
          character: actor.id,
          slot,
          target: candidate.id,
        });
      }
    }
  }

  return moves;
}

/** Apply the hits an ability lands, and give back the changed characters. */
function applyHits(
  rng: Rng,
  characters: readonly Character[],
  actor: Character,
  ability: Ability,
  targetId: CharacterId | null,
): { rng: Rng; characters: readonly Character[] } {
  if (!hitsOpponents(ability)) {
    // Nothing but damage is modelled yet, so an ability aimed at the actor's
    // own side does nothing beyond costing what it costs. Healing and buffs
    // land here when they are designed.
    return { rng, characters };
  }

  const reached = charactersHit(characters, actor, ability, targetId);
  if (reached.length === 0) {
    return { rng, characters };
  }

  // The order is the order charactersHit gives, front of the line first, so
  // the generator is drawn from in an order a replay repeats exactly.
  const damageById = new Map<CharacterId, number>();
  let current = rng;
  for (const target of reached) {
    const hit = strike(current, actor, target, ability.school, ability.power);
    current = hit.rng;
    damageById.set(target.id, hit.damage);
  }

  const updated = characters.map((character) => {
    const damage = damageById.get(character.id);
    if (damage === undefined) {
      return character;
    }
    const hurt = { ...character, hp: Math.max(0, character.hp - damage) };
    return gainEssence(hurt, ESSENCE_PER_HIT_TAKEN);
  });

  return { rng: current, characters: updated };
}

/** Apply one command to a state, and give back the state that follows. */
function applyOne(state: GameState, command: Command): GameState {
  if (state.outcome.kind === "decided") {
    throw new IllegalCommandError(
      "The match is over, and a finished match takes no more commands.",
    );
  }

  const elapsedCharacters = elapseToNextTurn(state.characters);
  const elapsed: GameState = { ...state, characters: elapsedCharacters };

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

  let characters = elapsedCharacters;
  let rng = state.rng;
  let players = state.players;

  if (command.kind === "act") {
    const ability = abilityAt(actor, command.slot);
    if (!canAfford(elapsed, actor, ability)) {
      throw new IllegalCommandError(
        `${actor.id} cannot pay for ${ability.name} right now.`,
      );
    }

    const cost = costOf(ability);

    // Pay first, then act, then gain. Paying first is what stops an ability
    // funding itself out of the Essence its own hit generates.
    characters = characters.map((character) =>
      character.id === actor.id
        ? {
            ...character,
            essence: character.essence - cost.essence,
            hp: character.hp - cost.hp,
          }
        : character,
    );
    players = withPlayerUpdated(players, actor.owner, {
      ...players[actor.owner],
      sharedEssence: players[actor.owner].sharedEssence - cost.shared,
    });

    const paidActor = characters.find((one) => one.id === actor.id);
    if (paidActor === undefined) {
      throw new IllegalCommandError(`${actor.id} left the match mid action.`);
    }

    const landed = applyHits(
      rng,
      characters,
      paidActor,
      ability,
      command.target,
    );
    rng = landed.rng;
    characters = landed.characters;

    if (ability.slot === "basic") {
      const pool = players[actor.owner];
      players = withPlayerUpdated(players, actor.owner, {
        ...pool,
        sharedEssence: Math.min(
          pool.maxSharedEssence,
          pool.sharedEssence + SHARED_PER_BASIC,
        ),
      });
    }
  }

  // Spending a turn fills a little Essence whatever the turn was spent on,
  // including a wait. A character who cannot act usefully is still building
  // towards the turn where they can.
  characters = characters.map((character) =>
    character.id === actor.id
      ? gainEssence(
          { ...character, actionValue: actionValueFor(character.stats.speed) },
          ESSENCE_PER_ACTION,
        )
      : character,
  );

  return {
    ...state,
    rng,
    characters,
    players: withPlayerUpdated(players, actor.owner, {
      ...players[actor.owner],
      lastActionOrdinal: state.actionOrdinal,
    }),
    actionOrdinal: state.actionOrdinal + 1,
    outcome: outcomeFor(characters),
  };
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
