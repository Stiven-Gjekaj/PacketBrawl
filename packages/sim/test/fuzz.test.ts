import { describe, expect, it } from "vitest";
import { hash, replay } from "../src/index.ts";
import { play } from "./fuzz-source.ts";

/**
 * What the fuzzer asserts.
 *
 * The generator and the driver live in fuzz-source.ts so that a match can be
 * built and replayed outside a test runner. A failure here is reproduced from
 * its seed, not from a description of it.
 */

const SEEDS = Array.from({ length: 120 }, (_, index) => index * 7919 + 13);

describe("fuzzing random legal commands", () => {
  it("never gives a move the rules then refuse", () => {
    // resolve throwing here is the failure. legalMoves and resolve are two
    // functions reading one state, and a command the first offers and the
    // second rejects is the exact hole a cheating client walks through.
    for (const seed of SEEDS) {
      expect(() => play(seed, false, 120)).not.toThrow();
    }
  });

  it("holds every invariant through every command", () => {
    // play() asserts on each state and each step, so reaching here without a
    // throw is the assertion. The count is checked so a fuzzer that silently
    // stopped playing cannot pass by doing nothing.
    let total = 0;
    for (const seed of SEEDS) {
      total += play(seed, true, 200).steps;
    }
    expect(total).toBeGreaterThan(SEEDS.length * 3);
  });
});

describe("determinism under fuzzing", () => {
  it("reaches the same state from the same seed", () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const first = play(seed, true, 150);
      const second = play(seed, true, 150);
      expect(hash(second.final)).toBe(hash(first.final));
      expect(second.commands).toEqual(first.commands);
    }
  });

  it("reaches a different state from a different seed", () => {
    // Without this the determinism test above would pass on an engine that
    // ignored its input entirely.
    const hashes = new Set(
      SEEDS.slice(0, 40).map((seed) => hash(play(seed, true, 150).final)),
    );
    expect(hashes.size).toBeGreaterThan(30);
  });
});

describe("replay against what was played", () => {
  it("rebuilds every fuzzed match from its command log", () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const played = play(seed, true, 150);
      const rebuilt = replay(played.options, played.commands);
      expect(hash(rebuilt.state)).toBe(hash(played.final));
    }
  });

  it("rebuilds the events as well as the state", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const played = play(seed, true, 150);
      const rebuilt = replay(played.options, played.commands);
      // A stored match is read back turn by turn, so the account has to
      // rebuild as exactly as the state does.
      expect(rebuilt.events.filter((e) => e.kind === "acted")).toHaveLength(
        played.commands.length,
      );
    }
  });

  it("rebuilds a state equal field for field, not merely alike", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const played = play(seed, true, 100);
      expect(replay(played.options, played.commands).state).toEqual(
        played.final,
      );
    }
  });
});

describe("matches end", () => {
  it("reaches a decision when both sides attack", () => {
    // A match that cannot end is worse than one that ends wrongly: nobody can
    // play it and no test above would notice.
    let decided = 0;
    for (const seed of SEEDS) {
      if (play(seed, true, 400).final.outcome.kind === "decided") {
        decided += 1;
      }
    }
    // Every one of them, not most. The seeds are fixed, so this cannot become
    // flaky, and a threshold set below what actually happens would let a
    // regression hide inside the slack it allowed for.
    expect(decided).toBe(SEEDS.length);
  });
});
