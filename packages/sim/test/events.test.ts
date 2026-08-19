import { describe, expect, it } from "vitest";
import { createMatch, type MatchOptions } from "../src/create-match.ts";
import type { MatchEvent } from "../src/events.ts";
import { hash } from "../src/hash.ts";
import { resolve } from "../src/resolve.ts";
import type { Command } from "../src/types.ts";
import { abilities, ability, stats } from "./support.ts";

function options(over: Partial<MatchOptions> = {}): MatchOptions {
  const squad = (prefix: string, lead: number) =>
    [0, 1, 2, 3].map((index) => ({
      id: `${prefix}${index}`,
      stats: stats({ speed: index === 0 ? lead : 10 }),
      maxEssence: 3,
      abilities: abilities(),
    }));
  return {
    matchId: "m",
    seed: 42,
    squads: [squad("a", 200), squad("b", 100)],
    ...over,
  };
}

const basic = (target: string): Command => ({
  kind: "act",
  character: "a0",
  slot: "basic",
  target,
});

const kinds = (events: readonly MatchEvent[]) => events.map((e) => e.kind);

describe("acted", () => {
  it("reports a wait with no ability", () => {
    const { events } = resolve(createMatch(options()), [
      { kind: "wait", character: "a0" },
    ]);
    expect(events).toEqual([
      {
        kind: "acted",
        ordinal: 0,
        character: "a0",
        action: "wait",
        ability: null,
      },
    ]);
  });

  it("names the ability a turn was spent on", () => {
    const { events } = resolve(createMatch(options()), [basic("b0")]);
    expect(events[0]).toMatchObject({
      kind: "acted",
      character: "a0",
      action: "basic",
      ability: "Test",
    });
  });

  it("counts the ordinal up across several commands", () => {
    let state = createMatch(options());
    const seen: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const step = resolve(state, [
        { kind: "wait", character: i % 2 === 0 ? "a0" : "b0" },
      ]);
      state = step.state;
      const acted = step.events[0];
      if (acted?.kind === "acted") seen.push(acted.ordinal);
    }
    expect(seen).toEqual([0, 1, 2]);
  });
});

describe("hit", () => {
  it("reports the damage the target actually took", () => {
    const { state, events } = resolve(createMatch(options()), [basic("b0")]);
    const hit = events.find((e) => e.kind === "hit");
    const target = state.characters.find((c) => c.id === "b0");
    expect(hit).toBeDefined();
    if (hit?.kind !== "hit" || target === undefined) throw new Error("no hit");
    expect(hit.damage).toBe(100 - target.hp);
    expect(hit.source).toBe("a0");
    expect(hit.target).toBe("b0");
  });

  // The reason this whole stream exists. Two states cannot be compared to
  // find a critical, because a critical and an ordinary large hit leave the
  // same HP behind.
  it("reports a critical, which no comparison of two states could find", () => {
    const critter = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({
            speed: index === 0 ? 200 : 10,
            critRate: 100,
            critDamage: 60,
          }),
          maxEssence: 3,
          abilities: abilities(),
        })),
        [0, 1, 2, 3].map((index) => ({
          id: `b${index}`,
          stats: stats({ speed: 10 }),
          maxEssence: 3,
          abilities: abilities(),
        })),
      ] as const,
    });
    const { events } = resolve(createMatch(critter), [basic("b0")]);
    const hit = events.find((e) => e.kind === "hit");
    if (hit?.kind !== "hit") throw new Error("no hit");
    expect(hit.critical).toBe(true);
  });

  it("reports no critical at a rate of zero", () => {
    const { events } = resolve(createMatch(options()), [basic("b0")]);
    const hit = events.find((e) => e.kind === "hit");
    if (hit?.kind !== "hit") throw new Error("no hit");
    expect(hit.critical).toBe(false);
  });

  it("reports one hit per character a blast reaches, front of the line first", () => {
    const blaster = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 200 : 10 }),
          maxEssence: 3,
          abilities: abilities({
            basic: ability({
              id: "wide",
              slot: "basic",
              target: "blast",
              power: 40,
            }),
          }),
        })),
        [0, 1, 2, 3].map((index) => ({
          id: `b${index}`,
          stats: stats({ speed: 10 }),
          maxEssence: 3,
          abilities: abilities(),
        })),
      ] as const,
    });
    const { events } = resolve(createMatch(blaster), [basic("b1")]);
    const hits = events.filter((e) => e.kind === "hit");
    expect(hits.map((e) => (e.kind === "hit" ? e.target : ""))).toEqual([
      "b0",
      "b1",
      "b2",
    ]);
  });
});

describe("fell", () => {
  it("reports a fall, and only after every hit of the action", () => {
    const lethal = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 200 : 10, attack: 1000 }),
          maxEssence: 3,
          abilities: abilities({
            basic: ability({
              id: "wide",
              slot: "basic",
              target: "blast",
              power: 100,
            }),
          }),
        })),
        [0, 1, 2, 3].map((index) => ({
          id: `b${index}`,
          stats: stats({ speed: 10, maxHp: 10 }),
          maxEssence: 3,
          abilities: abilities(),
        })),
      ] as const,
    });
    const { events } = resolve(createMatch(lethal), [basic("b1")]);
    // Three hits land, then three falls are reported. A fall inside the loop
    // would sit between two hits that both happened at once.
    expect(kinds(events)).toEqual([
      "acted",
      "hit",
      "hit",
      "hit",
      "fell",
      "fell",
      "fell",
      "sharedGained",
    ]);
  });

  it("does not report a fall for a character who was already down", () => {
    const state = createMatch(options());
    const downed = {
      ...state,
      characters: state.characters.map((c) =>
        c.id === "b0" ? { ...c, hp: 0 } : c,
      ),
    };
    const { events } = resolve(downed, [basic("b1")]);
    expect(kinds(events)).not.toContain("fell");
  });
});

describe("sharedGained", () => {
  it("reports what a basic put into the pool", () => {
    const { events } = resolve(createMatch(options()), [basic("b0")]);
    expect(events.find((e) => e.kind === "sharedGained")).toEqual({
      kind: "sharedGained",
      player: 0,
      amount: 1,
    });
  });

  it("reports nothing when the pool is already full", () => {
    const state = createMatch(options());
    const full = {
      ...state,
      players: [
        {
          ...state.players[0],
          sharedEssence: state.players[0].maxSharedEssence,
        },
        state.players[1],
      ] as const,
    };
    const { events } = resolve(full, [basic("b0")]);
    // A gain of zero would put a line in the log for something that did not
    // happen.
    expect(kinds(events)).not.toContain("sharedGained");
  });
});

describe("decided", () => {
  it("reports the winner on the action that ends the match", () => {
    const state = createMatch(options());
    const nearlyDone = {
      ...state,
      characters: state.characters.map((c) =>
        c.owner === 1 && c.id !== "b0" ? { ...c, hp: 0 } : c,
      ),
    };
    const finishing = {
      ...nearlyDone,
      characters: nearlyDone.characters.map((c) =>
        c.id === "b0" ? { ...c, hp: 1 } : c,
      ),
    };
    const { events } = resolve(finishing, [basic("b0")]);
    expect(events.at(-1)).toEqual({ kind: "decided", winner: 0 });
  });

  it("reports nothing while the match is still running", () => {
    const { events } = resolve(createMatch(options()), [basic("b0")]);
    expect(kinds(events)).not.toContain("decided");
  });
});

describe("the events are not part of the state", () => {
  // If events were hashed, rewording a report would void every recorded
  // match. A match is its commands; the events are what they are read to mean.
  it("leaves the state hash untouched", () => {
    const before = resolve(createMatch(options()), [basic("b0")]);
    const after = resolve(createMatch(options()), [basic("b0")]);
    expect(hash(before.state)).toBe(hash(after.state));
    expect(JSON.stringify(before.state)).not.toContain("acted");
  });

  it("reports the same events for the same commands", () => {
    const a = resolve(createMatch(options()), [basic("b0")]);
    const b = resolve(createMatch(options()), [basic("b0")]);
    expect(a.events).toEqual(b.events);
  });

  it("gives no events back for no commands", () => {
    expect(resolve(createMatch(options()), []).events).toEqual([]);
  });

  it("runs the events of several commands together in order", () => {
    // a0 at speed 200 against b0 at 100 does not act twice running: the tie on
    // the second turn goes to the side that has waited longer, which is b0.
    const two = resolve(createMatch(options()), [
      basic("b0"),
      { kind: "act", character: "b0", slot: "basic", target: "a0" },
    ]);
    const acted = two.events.filter((e) => e.kind === "acted");
    expect(acted.map((e) => (e.kind === "acted" ? e.character : ""))).toEqual([
      "a0",
      "b0",
    ]);
    expect(acted.map((e) => (e.kind === "acted" ? e.ordinal : -1))).toEqual([
      0, 1,
    ]);
  });
});
