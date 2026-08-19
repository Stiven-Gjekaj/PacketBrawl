"use client";

import {
  type AbilitySlot,
  type CharacterId,
  createMatch,
  type GameState,
  IllegalCommandError,
  resolve,
} from "@packetbrawl/sim";
import { create } from "zustand";
import { type LogLine, toLines } from "./log.ts";
import { soultaleMatch } from "./squads.ts";
import { actions, commandFor, type Pending } from "./view.ts";

/**
 * The one mutable thing in the app.
 *
 * The rules are pure and live in the sim. This holds the current state, what
 * the player has half-chosen, and the log so far. It decides nothing about
 * the game: every move goes through `resolve`, and an illegal one is refused
 * by the sim rather than prevented by the interface being careful.
 */

const OWNER = new Map<CharacterId, 0 | 1>();

function rememberOwners(state: GameState): void {
  for (const character of state.characters) {
    OWNER.set(character.id, character.owner);
  }
}

interface MatchStore {
  readonly state: GameState;
  readonly lines: readonly LogLine[];
  /** An action chosen but not yet aimed. */
  readonly pending: Pending;
  /** The character the pointer is over while aiming. */
  readonly aimed: CharacterId | null;
  readonly refused: string | null;
  choose: (slot: AbilitySlot | "wait") => void;
  aim: (id: CharacterId | null) => void;
  fire: (target: CharacterId | null) => void;
  cancel: () => void;
  restart: (seed: number) => void;
}

function begin(seed: number): GameState {
  const state = createMatch(soultaleMatch(seed));
  rememberOwners(state);
  return state;
}

export const useMatch = create<MatchStore>((set, get) => ({
  state: begin(1),
  lines: [],
  pending: null,
  aimed: null,
  refused: null,

  choose: (slot) => {
    const { state } = get();
    if (slot === "wait") {
      set({ pending: null });
      get().fire(null);
      return;
    }

    const offered = actions(state).find((one) => one.slot === slot);
    if (offered === undefined || !offered.affordable) {
      return;
    }

    // An ability that reaches everybody, or only its user, needs no aim. It
    // resolves on the one click rather than asking for a target that would
    // change nothing.
    set({ pending: { slot }, aimed: null, refused: null });
    if (!offered.needsTarget) {
      get().fire(null);
    }
  },

  aim: (id) => set({ aimed: id }),

  cancel: () => set({ pending: null, aimed: null, refused: null }),

  fire: (target) => {
    const { state, pending, lines } = get();
    const slot = pending?.slot ?? "wait";
    const command = commandFor(state, slot, target);
    if (command === null) {
      return;
    }
    try {
      const step = resolve(state, [command]);
      set({
        state: step.state,
        lines: [...lines, ...toLines(step.events, (id) => OWNER.get(id) ?? 0)],
        pending: null,
        aimed: null,
        refused: null,
      });
    } catch (error) {
      // The sim refuses, and the interface reports the refusal rather than
      // hiding it. A move the screen offered but the rules reject is a bug
      // worth seeing, not worth swallowing.
      set({
        refused:
          error instanceof IllegalCommandError ? error.message : String(error),
        pending: null,
        aimed: null,
      });
    }
  },

  restart: (seed) => set({ state: begin(seed), lines: [], pending: null, aimed: null, refused: null }),
}));
