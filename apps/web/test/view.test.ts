import {
  createMatch,
  forecast,
  legalMoves as legalMovesFor,
  nextToAct,
  resolve,
} from "@packetbrawl/sim";
import { describe, expect, it } from "vitest";
import { placeholderMatch } from "../src/lib/squads.ts";
import { actions, cards, commandFor, hpPercent, rail, wouldReach } from "../src/lib/view.ts";

const start = () => createMatch(placeholderMatch(1));

describe("hpPercent", () => {
  // The bar and the number beside it must agree, or the screen contradicts
  // itself in a way a reader will trust the wrong half of.
  it("rounds the way the printed number does", () => {
    expect(hpPercent(86, 120)).toBe(72);
    expect(hpPercent(30, 80)).toBe(38);
    expect(hpPercent(0, 70)).toBe(0);
    expect(hpPercent(90, 90)).toBe(100);
  });

  it("gives zero rather than a division by zero", () => {
    expect(hpPercent(0, 0)).toBe(0);
  });
});

describe("cards", () => {
  it("draws every character in the match", () => {
    expect(cards(start(), null, null)).toHaveLength(8);
  });

  it("marks the character whose turn it is", () => {
    const board = cards(start(), null, null);
    const acting = board.filter((c) => c.mood === "acting");
    expect(acting).toHaveLength(1);
    expect(acting[0]?.id).toBe(nextToAct(start())?.id);
  });

  it("agrees with the state about HP", () => {
    const state = start();
    for (const card of cards(state, null, null)) {
      const real = state.characters.find((c) => c.id === card.id);
      expect(card.hp).toBe(real?.hp);
      expect(card.maxHp).toBe(real?.stats.maxHp);
    }
  });

  it("marks a fallen character rather than hiding it", () => {
    const state = start();
    const downed = {
      ...state,
      characters: state.characters.map((c) =>
        c.id === "GLASS" ? { ...c, hp: 0 } : c,
      ),
    };
    const card = cards(downed, null, null).find((c) => c.id === "GLASS");
    expect(card?.mood).toBe("fallen");
    expect(card?.hpPercent).toBe(0);
  });
});

describe("wouldReach", () => {
  // The whole reason squad order is a position. Aiming a blast has to show
  // the neighbours it catches before the player commits to it.
  it("catches the target and both neighbours for a blast", () => {
    const state = start();
    const thorn = state.characters.find((c) => c.id === "THORN");
    const aiming = {
      ...state,
      characters: state.characters.map((c) =>
        c.id === thorn?.id ? { ...c, actionValue: 0 } : { ...c, actionValue: 999_999 },
      ),
    };
    const reached = wouldReach(aiming, { slot: "skill" }, "HOLLOW");
    expect([...reached].sort()).toEqual(["CINDER", "HOLLOW", "MARROW"]);
  });

  it("reaches nobody when no action is pending", () => {
    expect(wouldReach(start(), null, "HOLLOW").size).toBe(0);
  });
});

describe("rail", () => {
  // The rail is what both players read. If it disagreed with the engine it
  // would be a promise the match does not keep.
  it("shows exactly what the engine forecasts", () => {
    const state = start();
    expect(rail(state, 7).map((r) => r.id)).toEqual(
      forecast(state, 7).map((c) => c.id),
    );
  });

  it("asks for as many turns as it was given room for", () => {
    expect(rail(start(), 5)).toHaveLength(5);
  });
});

describe("actions", () => {
  it("offers four things to spend a turn on", () => {
    expect(actions(start()).map((a) => a.slot)).toEqual([
      "basic",
      "skill",
      "soul",
      "wait",
    ]);
  });

  // The shared pool starts empty and Essence at zero, so the opening turn can
  // only wait or use a basic.
  it("marks skill and soul unaffordable on the opening turn", () => {
    const opening = actions(start());
    expect(opening.find((a) => a.slot === "basic")?.affordable).toBe(true);
    expect(opening.find((a) => a.slot === "wait")?.affordable).toBe(true);
    expect(opening.find((a) => a.slot === "soul")?.affordable).toBe(false);
  });

  it("offers nothing once the match is decided", () => {
    const state = start();
    const finished = {
      ...state,
      outcome: { kind: "decided", winner: 0 },
    } as const;
    expect(actions({ ...state, outcome: finished.outcome })).toEqual([]);
  });

  it("says which actions need aiming", () => {
    const state = start();
    const thorn = {
      ...state,
      characters: state.characters.map((c) =>
        c.id === "THORN" ? { ...c, actionValue: 0 } : { ...c, actionValue: 999_999 },
      ),
    };
    const list = actions(thorn);
    expect(list.find((a) => a.slot === "skill")?.needsTarget).toBe(true);
    // Briarheart reaches every enemy, so there is nothing to aim.
    expect(list.find((a) => a.slot === "soul")?.needsTarget).toBe(false);
    expect(list.find((a) => a.slot === "wait")?.needsTarget).toBe(false);
  });
});

describe("commandFor", () => {
  it("builds a command the sim accepts", () => {
    const state = start();
    const actor = nextToAct(state);
    const command = commandFor(state, "basic", "CINDER");
    expect(command).toEqual({
      kind: "act",
      character: actor?.id,
      slot: "basic",
      target: "CINDER",
    });
    expect(() => resolve(state, command === null ? [] : [command])).not.toThrow();
  });

  it("builds a wait that names the acting character", () => {
    const state = start();
    expect(commandFor(state, "wait", null)).toEqual({
      kind: "wait",
      character: nextToAct(state)?.id,
    });
  });
});

describe("aiming marks the right side", () => {
  const aiming = () => {
    const state = start();
    return {
      ...state,
      characters: state.characters.map((c) =>
        c.id === "THORN"
          ? { ...c, actionValue: 0 }
          : { ...c, actionValue: 999_999 },
      ),
    };
  };

  it("offers every living enemy as a target", () => {
    const board = cards(aiming(), { slot: "basic" }, null);
    const offered = board.filter((c) => c.mood === "reachable" || c.mood === "target");
    expect(offered.map((c) => c.id).sort()).toEqual([
      "CINDER",
      "GLASS",
      "HOLLOW",
      "MARROW",
    ]);
  });

  // Out of reach must mean "aimed at, and still not a target". Saying it of
  // an ally invites the player to try clicking one.
  it("does not call an ally out of reach", () => {
    const board = cards(aiming(), { slot: "basic" }, null);
    const mine = board.filter((c) => c.owner === 0 && c.id !== "THORN");
    expect(mine.map((c) => c.mood)).toEqual(["idle", "idle", "idle"]);
  });

  it("shows the neighbours a blast would catch before it is fired", () => {
    const board = cards(aiming(), { slot: "skill" }, "HOLLOW");
    const caught = board.filter((c) => c.mood === "splash" || c.mood === "target");
    expect(caught.map((c) => c.id).sort()).toEqual(["CINDER", "HOLLOW", "MARROW"]);
  });
});

describe("a whole match can be finished", () => {
  // The point of M1 is that two people can play a match to its end. If the
  // loop can deadlock or run forever, that is the bug that matters most.
  it("reaches a decision from legal moves alone", () => {
    let state = start();
    let guard = 0;
    while (state.outcome.kind === "playing" && guard < 400) {
      const actor = nextToAct(state);
      if (actor === null) break;
      const moves = [
        ...legalMovesFor(state, 0),
        ...legalMovesFor(state, 1),
      ];
      const attack = moves.find((m) => m.kind === "act" && m.target !== null);
      const chosen = attack ?? moves[0];
      if (chosen === undefined) break;
      state = resolve(state, [chosen]).state;
      guard += 1;
    }
    expect(state.outcome.kind).toBe("decided");
    expect(guard).toBeLessThan(400);
  });
});
