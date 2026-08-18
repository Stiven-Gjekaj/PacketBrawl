import { describe, expect, it } from "vitest";
import {
  ACTION_VALUE_SCALE,
  actionValueFor,
  BASE_ACTION_VALUE,
  forecast,
  nextToAct,
} from "../src/action-value.ts";
import { createMatch, type SquadMember } from "../src/create-match.ts";
import type { GameState, Stats } from "../src/types.ts";
import { abilities } from "./support.ts";

/** A character who differs from every other only in speed. */
function member(id: string, speed: number): SquadMember {
  const stats: Stats = {
    maxHp: 100,
    attack: 10,
    defence: 10,
    magicAttack: 10,
    magicDefence: 10,
    speed,
    critRate: 0,
    critDamage: 50,
  };
  return { id, stats, maxEssence: 3, abilities: abilities() };
}

/**
 * A match where each side has one character that matters and three that are
 * so slow they never reach a turn inside the window a test looks at.
 */
function duel(leftSpeed: number, rightSpeed: number): GameState {
  return createMatch({
    matchId: "test",
    seed: 1,
    squads: [
      [
        member("left", leftSpeed),
        member("left-b", 1),
        member("left-c", 1),
        member("left-d", 1),
      ],
      [
        member("right", rightSpeed),
        member("right-b", 1),
        member("right-c", 1),
        member("right-d", 1),
      ],
    ],
  });
}

describe("actionValueFor", () => {
  it("refuses a speed that cannot reach a turn", () => {
    expect(() => actionValueFor(0)).toThrow(RangeError);
    expect(() => actionValueFor(-5)).toThrow(RangeError);
    expect(() => actionValueFor(12.5)).toThrow(RangeError);
  });

  it("gives a shorter distance to a faster character", () => {
    expect(actionValueFor(200)).toBeLessThan(actionValueFor(100));
    expect(actionValueFor(101)).toBeLessThan(actionValueFor(100));
  });

  it("halves the distance when speed doubles", () => {
    expect(actionValueFor(100)).toBe(
      (BASE_ACTION_VALUE * ACTION_VALUE_SCALE) / 100,
    );
    expect(actionValueFor(200) * 2).toBe(actionValueFor(100));
  });

  it("separates speeds that are only one apart", () => {
    expect(actionValueFor(137)).not.toBe(actionValueFor(138));
  });
});

describe("nextToAct", () => {
  it("gives the fastest character the first turn", () => {
    expect(nextToAct(duel(150, 100))?.id).toBe("left");
    expect(nextToAct(duel(100, 150))?.id).toBe("right");
  });

  it("gives nobody a turn when every character has fallen", () => {
    const state = duel(100, 100);
    const emptied: GameState = {
      ...state,
      characters: state.characters.map((character) => ({
        ...character,
        hp: 0,
      })),
    };
    expect(nextToAct(emptied)).toBeNull();
  });

  it("passes over a character that has fallen", () => {
    const state = duel(200, 100);
    const withoutTheFastest: GameState = {
      ...state,
      characters: state.characters.map((character) =>
        character.id === "left" ? { ...character, hp: 0 } : character,
      ),
    };
    expect(nextToAct(withoutTheFastest)?.id).toBe("right");
  });
});

describe("forecast", () => {
  it("refuses a length that is not a whole number of zero or more", () => {
    expect(() => forecast(duel(100, 100), -1)).toThrow(RangeError);
    expect(() => forecast(duel(100, 100), 1.5)).toThrow(RangeError);
  });

  it("gives nothing back for a match that is over", () => {
    const state = duel(100, 100);
    const finished: GameState = {
      ...state,
      outcome: { kind: "decided", winner: 0 },
    };
    expect(forecast(finished, 5)).toEqual([]);
  });

  // This is the behaviour the turn engine exists for. A character fast enough
  // reaches two turns inside the distance a slow character needs for one, and
  // nothing in the order owes the slow character a turn in between.
  it("lets a fast character act twice before a slow one acts once", () => {
    const order = forecast(duel(250, 100), 4).map((c) => c.id);
    expect(order).toEqual(["left", "left", "right", "left"]);
  });

  it("alternates between two characters of equal speed", () => {
    const order = forecast(duel(100, 100), 6).map((c) => c.id);
    expect(order).toEqual(["left", "right", "left", "right", "left", "right"]);
  });

  // A tie is settled by which side waited longer, so neither player keeps an
  // advantage from one. Without that rule the left squad would take every
  // tie for the whole match.
  it("does not let one side keep winning ties", () => {
    const order = forecast(duel(100, 100), 10).map((c) => c.id);
    const left = order.filter((id) => id === "left").length;
    const right = order.filter((id) => id === "right").length;
    expect(left).toBe(5);
    expect(right).toBe(5);
  });

  it("stops early when only one character can still act", () => {
    const state = duel(100, 100);
    const oneLeft: GameState = {
      ...state,
      characters: state.characters.map((character) =>
        character.id === "left" ? character : { ...character, hp: 0 },
      ),
    };
    expect(forecast(oneLeft, 3).map((c) => c.id)).toEqual([
      "left",
      "left",
      "left",
    ]);
  });

  it("gives back exactly the number of turns it was asked for", () => {
    expect(forecast(duel(133, 97), 0)).toHaveLength(0);
    expect(forecast(duel(133, 97), 1)).toHaveLength(1);
    expect(forecast(duel(133, 97), 12)).toHaveLength(12);
  });

  it("leaves the state it was given untouched", () => {
    const state = duel(160, 90);
    const before = JSON.stringify(state);
    forecast(state, 20);
    expect(JSON.stringify(state)).toBe(before);
  });
});
