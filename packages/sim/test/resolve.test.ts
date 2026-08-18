import { describe, expect, it } from "vitest";
import { forecast, nextToAct } from "../src/action-value.ts";
import { createMatch, type MatchOptions } from "../src/create-match.ts";
import { hash } from "../src/hash.ts";
import { replay } from "../src/replay.ts";
import {
  IllegalCommandError,
  legalMoves,
  outcomeFor,
  resolve,
} from "../src/resolve.ts";
import type { Command, GameState, Stats } from "../src/types.ts";

function stats(speed: number): Stats {
  return {
    maxHp: 100,
    attack: 10,
    defence: 10,
    magicAttack: 10,
    magicDefence: 10,
    speed,
    critRate: 0,
    critDamage: 50,
  };
}

function options(leftLead = 150, rightLead = 120): MatchOptions {
  const squad = (prefix: string, leadSpeed: number) =>
    [0, 1, 2, 3].map((index) => ({
      id: `${prefix}${index}`,
      stats: stats(index === 0 ? leadSpeed : 100),
      maxEssence: 3,
    }));

  return {
    matchId: "m1",
    seed: 42,
    squads: [squad("a", leftLead), squad("b", rightLead)],
  };
}

/** Take `count` turns, always giving the command the state allows. */
function playOut(state: GameState, count: number): [GameState, Command[]] {
  let current = state;
  const given: Command[] = [];
  for (let i = 0; i < count; i += 1) {
    const actor = nextToAct(current);
    if (actor === null) {
      break;
    }
    const command: Command = { kind: "wait", character: actor.id };
    given.push(command);
    current = resolve(current, [command]);
  }
  return [current, given];
}

describe("legalMoves", () => {
  it("offers a move only to the player whose turn it is", () => {
    const state = createMatch(options(150, 120));
    expect(legalMoves(state, 0)).toEqual([{ kind: "wait", character: "a0" }]);
    expect(legalMoves(state, 1)).toEqual([]);
  });

  it("offers the other player a move once the turn passes", () => {
    const state = resolve(createMatch(options(150, 120)), [
      { kind: "wait", character: "a0" },
    ]);
    expect(legalMoves(state, 0)).toEqual([]);
    expect(legalMoves(state, 1)).toEqual([{ kind: "wait", character: "b0" }]);
  });

  it("offers nothing at all once the match is decided", () => {
    const state = createMatch(options());
    const finished: GameState = {
      ...state,
      outcome: { kind: "decided", winner: 0 },
    };
    expect(legalMoves(finished, 0)).toEqual([]);
    expect(legalMoves(finished, 1)).toEqual([]);
  });
});

describe("resolve", () => {
  it("gives back the same state when given no commands", () => {
    const state = createMatch(options());
    expect(resolve(state, [])).toBe(state);
  });

  it("leaves the state it was given untouched", () => {
    const state = createMatch(options());
    const before = JSON.stringify(state);
    resolve(state, [{ kind: "wait", character: "a0" }]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("counts the actions taken", () => {
    const [state] = playOut(createMatch(options()), 5);
    expect(state.actionOrdinal).toBe(5);
  });

  it("refuses a command that names a character who is not on turn", () => {
    const state = createMatch(options(150, 120));
    expect(() => resolve(state, [{ kind: "wait", character: "b0" }])).toThrow(
      IllegalCommandError,
    );
  });

  it("refuses a command that names a character who is not in the match", () => {
    const state = createMatch(options());
    expect(() =>
      resolve(state, [{ kind: "wait", character: "nobody" }]),
    ).toThrow(IllegalCommandError);
  });

  it("refuses any command once the match is decided", () => {
    const state = createMatch(options());
    const finished: GameState = {
      ...state,
      outcome: { kind: "decided", winner: 0 },
    };
    expect(() =>
      resolve(finished, [{ kind: "wait", character: "a0" }]),
    ).toThrow(IllegalCommandError);
  });

  it("declares the winner when one squad has been emptied", () => {
    const state = createMatch(options());
    const oneSideDown: GameState = {
      ...state,
      characters: state.characters.map((character) =>
        character.owner === 1 ? { ...character, hp: 0 } : character,
      ),
    };
    const after = resolve(oneSideDown, [{ kind: "wait", character: "a0" }]);
    expect(after.outcome).toEqual({ kind: "decided", winner: 0 });
  });

  it("declares the other winner just the same", () => {
    const state = createMatch(options(150, 120));
    const oneSideDown: GameState = {
      ...state,
      characters: state.characters.map((character) =>
        character.owner === 0 && character.id !== "a0"
          ? { ...character, hp: 0 }
          : character,
      ),
    };
    // a0 is the last of the left squad, and falls on its own turn.
    const doomed: GameState = {
      ...oneSideDown,
      characters: oneSideDown.characters.map((character) =>
        character.id === "a0" ? { ...character, hp: 0 } : character,
      ),
    };
    const after = resolve(doomed, [{ kind: "wait", character: "b0" }]);
    expect(after.outcome).toEqual({ kind: "decided", winner: 1 });
  });
});

describe("outcomeFor", () => {
  const squad = createMatch(options()).characters;

  it("says the match is still running while both squads stand", () => {
    expect(outcomeFor(squad)).toEqual({ kind: "playing" });
  });

  it("says a squad with one character left is still standing", () => {
    const nearlyGone = squad.map((character) =>
      character.owner === 1 && character.id !== "b3"
        ? { ...character, hp: 0 }
        : character,
    );
    expect(outcomeFor(nearlyGone)).toEqual({ kind: "playing" });
  });

  it("gives the win to the squad still standing", () => {
    const rightGone = squad.map((character) =>
      character.owner === 1 ? { ...character, hp: 0 } : character,
    );
    expect(outcomeFor(rightGone)).toEqual({ kind: "decided", winner: 0 });

    const leftGone = squad.map((character) =>
      character.owner === 0 ? { ...character, hp: 0 } : character,
    );
    expect(outcomeFor(leftGone)).toEqual({ kind: "decided", winner: 1 });
  });

  // No action can reach this yet, because nothing deals damage. It is here
  // because an ability that costs the user HP can empty both squads at once,
  // and the rule has to answer before that ability is written rather than
  // after somebody finds out that it cannot.
  it("gives the win to nobody when both squads are emptied", () => {
    const allGone = squad.map((character) => ({ ...character, hp: 0 }));
    expect(outcomeFor(allGone)).toEqual({ kind: "decided", winner: null });
  });
});

describe("the forecast against what actually happens", () => {
  // The sidebar shows both players who is coming up. Nothing acts outside the
  // order, so the forecast is a promise rather than a guess, and this is the
  // test that holds it to that.
  it("names exactly the characters that go on to act, in order", () => {
    for (const [left, right] of [
      [150, 120],
      [250, 100],
      [100, 100],
      [101, 100],
      [300, 97],
    ] as const) {
      const state = createMatch(options(left, right));
      const predicted = forecast(state, 12).map((c) => c.id);
      const [, given] = playOut(state, 12);
      expect(given.map((c) => c.character)).toEqual(predicted);
    }
  });
});

describe("replay", () => {
  it("rebuilds the same state from the same commands", () => {
    const opts = options(150, 120);
    const [played, given] = playOut(createMatch(opts), 10);
    expect(hash(replay(opts, given))).toBe(hash(played));
  });

  it("rebuilds a state that is equal field for field, not merely alike", () => {
    const opts = options(133, 97);
    const [played, given] = playOut(createMatch(opts), 7);
    expect(replay(opts, given)).toEqual(played);
  });

  it("gives the starting state back for an empty command log", () => {
    const opts = options();
    expect(hash(replay(opts, []))).toBe(hash(createMatch(opts)));
  });
});
