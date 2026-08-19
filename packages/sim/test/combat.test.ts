import { describe, expect, it } from "vitest";
import { createMatch, type MatchOptions } from "../src/create-match.ts";
import { hash } from "../src/hash.ts";
import {
  ESSENCE_PER_ACTION,
  ESSENCE_PER_HIT_TAKEN,
  IllegalCommandError,
  legalMoves,
  resolve,
} from "../src/resolve.ts";
import type { Command, GameState } from "../src/types.ts";
import { abilities, ability, stats } from "./support.ts";

function options(over: Partial<MatchOptions> = {}): MatchOptions {
  const squad = (prefix: string, leadSpeed: number) =>
    [0, 1, 2, 3].map((index) => ({
      id: `${prefix}${index}`,
      stats: stats({ speed: index === 0 ? leadSpeed : 10 }),
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

function find(state: GameState, id: string) {
  const one = state.characters.find((c) => c.id === id);
  if (one === undefined) throw new Error(`no ${id}`);
  return one;
}

const basicAt = (target: string): Command => ({
  kind: "act",
  character: "a0",
  slot: "basic",
  target,
});

describe("a basic attack", () => {
  // attack 100, power 50, defence 0. So raw is 50 and none is mitigated.
  it("takes the damage the formula says", () => {
    const after = resolve(createMatch(options()), [basicAt("b0")]).state;
    expect(find(after, "b0").hp).toBe(50);
  });

  it("fills the squad's shared pool", () => {
    const after = resolve(createMatch(options()), [basicAt("b0")]).state;
    expect(after.players[0].sharedEssence).toBe(1);
    expect(after.players[1].sharedEssence).toBe(0);
  });

  it("touches nobody but its target", () => {
    const after = resolve(createMatch(options()), [basicAt("b1")]).state;
    expect(find(after, "b0").hp).toBe(100);
    expect(find(after, "b1").hp).toBe(50);
    expect(find(after, "b2").hp).toBe(100);
  });
});

describe("Essence", () => {
  it("fills a little for spending a turn", () => {
    const after = resolve(createMatch(options()), [basicAt("b0")]).state;
    expect(find(after, "a0").essence).toBe(ESSENCE_PER_ACTION);
  });

  it("fills for being hit as well as for acting", () => {
    const after = resolve(createMatch(options()), [basicAt("b0")]).state;
    expect(find(after, "b0").essence).toBe(ESSENCE_PER_HIT_TAKEN);
  });

  it("fills even on a turn spent waiting", () => {
    const after = resolve(createMatch(options()), [
      { kind: "wait", character: "a0" },
    ]).state;
    expect(find(after, "a0").essence).toBe(ESSENCE_PER_ACTION);
  });

  it("never passes the character's own ceiling", () => {
    let state = createMatch(options());
    for (let i = 0; i < 20; i += 1) {
      const actor = legalMoves(state, 0)[0] ?? legalMoves(state, 1)[0];
      if (actor === undefined) break;
      state = resolve(state, [actor]).state;
    }
    for (const character of state.characters) {
      expect(character.essence).toBeLessThanOrEqual(character.maxEssence);
    }
  });

  // The character who pays in blood instead. No special case reaches them.
  it("never fills for a character whose ceiling is zero", () => {
    const bloodless = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 200 : 10 }),
          maxEssence: 0,
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
    const after = resolve(createMatch(bloodless), [basicAt("b0")]).state;
    expect(find(after, "a0").essence).toBe(0);
  });
});

describe("paying for an ability", () => {
  it("refuses a skill when the shared pool is empty", () => {
    expect(
      () =>
        resolve(createMatch(options()), [
          { kind: "act", character: "a0", slot: "skill", target: "b0" },
        ]).state,
    ).toThrow(IllegalCommandError);
  });

  it("allows the skill once a basic has funded it", () => {
    // Speed 300 against 100 gives a0 three turns before b0 reaches one.
    // Speed 200 would not: the tie at the second turn goes to the side that
    // has waited longer, which is b0.
    const fast = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 300 : 10 }),
          maxEssence: 3,
          abilities: abilities(),
        })),
        [0, 1, 2, 3].map((index) => ({
          id: `b${index}`,
          stats: stats({ speed: 100 }),
          maxEssence: 3,
          abilities: abilities(),
        })),
      ] as const,
    });
    const state = resolve(createMatch(fast), [basicAt("b0")]).state;
    const after = resolve(state, [
      { kind: "act", character: "a0", slot: "skill", target: "b0" },
    ]).state;
    expect(after.players[0].sharedEssence).toBe(0);
    expect(find(after, "b0").hp).toBeLessThan(50);
  });

  it("takes HP from a character whose ability is priced in blood", () => {
    const blood = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 200 : 10 }),
          maxEssence: 0,
          abilities: abilities({
            basic: ability({
              id: "blood",
              slot: "basic",
              cost: { hp: 15 },
              power: 200,
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
    const after = resolve(createMatch(blood), [basicAt("b0")]).state;
    expect(find(after, "a0").hp).toBe(85);
    expect(find(after, "b0").hp).toBe(0);
  });

  it("refuses a price in blood that the character cannot survive", () => {
    const fatal = options({
      squads: [
        [0, 1, 2, 3].map((index) => ({
          id: `a${index}`,
          stats: stats({ speed: index === 0 ? 200 : 10 }),
          maxEssence: 0,
          abilities: abilities({
            basic: ability({ id: "fatal", slot: "basic", cost: { hp: 100 } }),
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
    // Paying should never be a way to die, so a cost equal to full HP is
    // refused rather than resolved into a corpse mid action.
    expect(() => resolve(createMatch(fatal), [basicAt("b0")]).state).toThrow(
      IllegalCommandError,
    );
  });
});

// The gap SECURITY.md names as in scope. The server checks legalMoves and
// then calls resolve, so a command the first refuses and the second accepts
// is the exact hole a cheating client walks through.
describe("resolve refuses what legalMoves does not offer", () => {
  it("refuses every unaffordable slot at the opening", () => {
    const state = createMatch(options());
    const offered = legalMoves(state, 0);
    const offeredSlots = new Set(
      offered.map((m) => (m.kind === "act" ? m.slot : "wait")),
    );
    expect(offeredSlots.has("skill")).toBe(false);
    expect(offeredSlots.has("soul")).toBe(false);

    for (const slot of ["skill", "soul"] as const) {
      expect(
        () =>
          resolve(state, [{ kind: "act", character: "a0", slot, target: "b0" }])
            .state,
      ).toThrow(IllegalCommandError);
    }
  });

  it("accepts every command it does offer", () => {
    const state = createMatch(options());
    for (const move of legalMoves(state, 0)) {
      expect(() => resolve(state, [move]).state).not.toThrow();
    }
  });
});

describe("a match that runs to its end", () => {
  it("declares a winner once a squad is emptied", () => {
    let state = createMatch(
      options({
        squads: [
          [0, 1, 2, 3].map((index) => ({
            id: `a${index}`,
            stats: stats({ speed: 300, attack: 1000 }),
            maxEssence: 3,
            abilities: abilities(),
          })),
          [0, 1, 2, 3].map((index) => ({
            id: `b${index}`,
            stats: stats({ speed: 1, maxHp: 10 }),
            maxEssence: 3,
            abilities: abilities(),
          })),
        ] as const,
      }),
    );

    for (
      let turn = 0;
      turn < 40 && state.outcome.kind === "playing";
      turn += 1
    ) {
      const moves = [...legalMoves(state, 0), ...legalMoves(state, 1)];
      const attack = moves.find((m) => m.kind === "act") ?? moves[0];
      if (attack === undefined) break;
      state = resolve(state, [attack]).state;
    }

    expect(state.outcome).toEqual({ kind: "decided", winner: 0 });
  });
});

describe("determinism with damage in play", () => {
  it("reaches the same state from the same commands", () => {
    const opts = options();
    const play = (): GameState => {
      let state = createMatch(opts);
      for (let i = 0; i < 12; i += 1) {
        const moves = [...legalMoves(state, 0), ...legalMoves(state, 1)];
        const chosen = moves.find((m) => m.kind === "act") ?? moves[0];
        if (chosen === undefined) break;
        state = resolve(state, [chosen]).state;
      }
      return state;
    };
    expect(hash(play())).toBe(hash(play()));
  });

  it("reaches a different state from a different seed", () => {
    const crit = { critRate: 50, critDamage: 100 };
    const build = (seed: number) =>
      createMatch(
        options({
          seed,
          squads: [
            [0, 1, 2, 3].map((index) => ({
              id: `a${index}`,
              stats: stats({ speed: index === 0 ? 200 : 10, ...crit }),
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
        }),
      );
    // With a crit rate in play the seed decides real outcomes, so two seeds
    // must be able to disagree. Without this the generator could be ignored
    // entirely and every other test would still pass.
    const one = resolve(build(1), [basicAt("b0")]).state;
    const two = resolve(build(9), [basicAt("b0")]).state;
    expect(find(one, "b0").hp).not.toBe(find(two, "b0").hp);
  });
});
