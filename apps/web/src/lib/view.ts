import {
  type AbilitySlot,
  type Character,
  type CharacterId,
  type Command,
  charactersHit,
  type GameState,
  isAlive,
  type PlayerSlot,
  abilityAt,
  canAfford,
  forecast,
  legalMoves,
  nextToAct,
} from "@packetbrawl/sim";

/**
 * What the screen shows, worked out from a state.
 *
 * These are plain functions over plain data. Nothing here touches React or
 * the DOM, so the whole of what a player sees can be asserted in a test that
 * needs no browser. The components below only draw what these return.
 */

/** How a card is being treated by the action the player is considering. */
export type CardMood =
  | "acting"
  | "target"
  | "splash"
  | "reachable"
  | "unreachable"
  | "idle"
  | "fallen";

export interface CardView {
  readonly id: CharacterId;
  readonly name: string;
  readonly initial: string;
  readonly owner: PlayerSlot;
  readonly slot: number;
  readonly hp: number;
  readonly maxHp: number;
  /** Whole percent, matching the number printed beside it. */
  readonly hpPercent: number;
  readonly essence: number;
  readonly maxEssence: number;
  readonly speed: number;
  readonly mood: CardMood;
  readonly note: string;
}

export interface RailEntry {
  readonly id: CharacterId;
  readonly name: string;
  readonly owner: PlayerSlot;
  readonly speed: number;
}

export interface ActionView {
  readonly slot: AbilitySlot | "wait";
  readonly name: string;
  readonly detail: string;
  readonly affordable: boolean;
  readonly needsTarget: boolean;
  readonly cost: { readonly shared: number; readonly essence: number; readonly hp: number };
}

/** An action the player has chosen but not yet aimed. */
export type Pending = { readonly slot: AbilitySlot } | null;

const SHAPE_LABEL: Record<string, string> = {
  single: "single",
  blast: "blast",
  all: "all enemies",
  self: "self",
  ally: "one ally",
  allAllies: "your squad",
};

/** Percent of a bar, rounded the same way the printed number is. */
export function hpPercent(hp: number, maxHp: number): number {
  return maxHp === 0 ? 0 : Math.round((hp * 100) / maxHp);
}

/** Which characters the pending action would reach if aimed at `target`. */
export function wouldReach(
  state: GameState,
  pending: Pending,
  target: CharacterId | null,
): Set<CharacterId> {
  const actor = nextToAct(state);
  if (actor === null || pending === null) {
    return new Set();
  }
  const ability = abilityAt(actor, pending.slot);
  return new Set(
    charactersHit(state.characters, actor, ability, target).map((one) => one.id),
  );
}

function moodOf(
  character: Character,
  actor: Character | null,
  reached: Set<CharacterId>,
  aimed: CharacterId | null,
  selectable: Set<CharacterId>,
  targetSide: PlayerSlot | null,
): CardMood {
  if (!isAlive(character)) return "fallen";
  if (actor !== null && character.id === actor.id) return "acting";
  if (aimed !== null && character.id === aimed) return "target";
  if (reached.has(character.id)) return "splash";
  if (selectable.has(character.id)) return "reachable";
  // Out of reach means "on the side being aimed at, and still not a target".
  // A character on the other side is not out of reach, it is simply not who
  // this action is for, and saying otherwise invites the player to try.
  if (targetSide !== null && character.owner === targetSide) return "unreachable";
  return "idle";
}

function noteOf(mood: CardMood, character: Character): string {
  switch (mood) {
    case "acting":
      return `ACTING - SPD ${character.stats.speed}`;
    case "target":
      return "TARGET";
    case "splash":
      return "SPLASH";
    case "unreachable":
      return "OUT OF REACH";
    case "fallen":
      return "FALLEN - GAP IN LINE";
    default:
      return `SPD ${character.stats.speed}`;
  }
}

/** Every card on the board, in squad order, opponents first. */
export function cards(
  state: GameState,
  pending: Pending,
  aimed: CharacterId | null,
): CardView[] {
  const actor = nextToAct(state);
  const reached = wouldReach(state, pending, aimed);
  const selectable = new Set(
    legalMoves(state, actor?.owner ?? 0)
      .filter((m) => m.kind === "act" && pending !== null && m.slot === pending.slot)
      .map((m) => (m.kind === "act" ? m.target : null))
      .filter((id): id is CharacterId => id !== null),
  );

  const targetSide =
    selectable.size === 0
      ? null
      : (state.characters.find((one) => selectable.has(one.id))?.owner ?? null);

  return state.characters.map((character) => {
    const mood = moodOf(character, actor, reached, aimed, selectable, targetSide);
    return {
      id: character.id,
      name: character.id,
      initial: character.id.slice(0, 1),
      owner: character.owner,
      slot: character.slot,
      hp: character.hp,
      maxHp: character.stats.maxHp,
      hpPercent: hpPercent(character.hp, character.stats.maxHp),
      essence: character.essence,
      maxEssence: character.maxEssence,
      speed: character.stats.speed,
      mood,
      note: noteOf(mood, character),
    };
  });
}

/** The upcoming turns, exactly as the match will take them. */
export function rail(state: GameState, count: number): RailEntry[] {
  return forecast(state, count).map((one) => ({
    id: one.id,
    name: one.id,
    owner: one.owner,
    speed: one.stats.speed,
  }));
}

/** The four things the acting player can spend this turn on. */
export function actions(state: GameState): ActionView[] {
  const actor = nextToAct(state);
  if (actor === null || state.outcome.kind === "decided") {
    return [];
  }

  const built: ActionView[] = (["basic", "skill", "soul"] as const).map((slot) => {
    const ability = abilityAt(actor, slot);
    const cost = {
      shared: ability.cost.shared ?? 0,
      essence: ability.cost.essence ?? 0,
      hp: ability.cost.hp ?? 0,
    };
    const price =
      cost.hp > 0
        ? `${cost.hp} HP`
        : cost.essence > 0
          ? `${cost.essence} essence`
          : cost.shared > 0
            ? `${cost.shared} shared`
            : "free";
    return {
      slot,
      name: ability.name,
      detail: `${SHAPE_LABEL[ability.target] ?? ability.target} - ${ability.power}% - ${price}`,
      affordable: canAfford(state, actor, ability),
      needsTarget:
        ability.target === "single" ||
        ability.target === "blast" ||
        ability.target === "ally",
      cost,
    };
  });

  return [
    ...built,
    {
      slot: "wait",
      name: "Wait",
      detail: "give up the turn",
      affordable: true,
      needsTarget: false,
      cost: { shared: 0, essence: 0, hp: 0 },
    },
  ];
}

/** The command a click produces, or null when that click is not a move. */
export function commandFor(
  state: GameState,
  slot: AbilitySlot | "wait",
  target: CharacterId | null,
): Command | null {
  const actor = nextToAct(state);
  if (actor === null) return null;
  if (slot === "wait") return { kind: "wait", character: actor.id };
  return { kind: "act", character: actor.id, slot, target };
}

/** Whose turn it is, for the banner that tells a hotseat who holds the keyboard. */
export function onTurn(state: GameState): PlayerSlot | null {
  return nextToAct(state)?.owner ?? null;
}
