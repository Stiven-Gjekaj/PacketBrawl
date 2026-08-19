import {
  createMatch,
  digest,
  legalMoves,
  nextToAct,
  resolve,
  SQUAD_SIZE,
} from "@packetbrawl/sim";
import { describe, expect, it } from "vitest";
import { CAST, CONTENT_VERSION, ROSTER, squadsOf } from "../src/characters.ts";

describe("the cast", () => {
  it("holds eight characters", () => {
    expect(CAST).toHaveLength(SQUAD_SIZE * 2);
  });

  it("gives every character a distinct name", () => {
    expect(new Set(CAST.map((one) => one.id)).size).toBe(CAST.length);
  });

  it("cites a chapter for every character", () => {
    // The spoiler policy is published chapters only, and a citation is what
    // makes that checkable rather than a promise.
    for (const one of CAST) {
      expect(one.sources.length).toBeGreaterThan(0);
      for (const source of one.sources) {
        expect(source).toMatch(/^ch\. \d+$/);
      }
    }
  });

  it("names a soul for every character", () => {
    for (const one of CAST) {
      expect(one.soul.length).toBeGreaterThan(0);
    }
  });

  it("gives every character the three slots, each in its own slot", () => {
    for (const one of CAST) {
      expect(one.abilities.basic.slot).toBe("basic");
      expect(one.abilities.skill.slot).toBe("skill");
      expect(one.abilities.soul.slot).toBe("soul");
    }
  });

  it("gives every ability a distinct id", () => {
    const ids = CAST.flatMap((one) => [
      one.abilities.basic.id,
      one.abilities.skill.id,
      one.abilities.soul.id,
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves every basic free, because a basic is what funds the pool", () => {
    for (const one of CAST) {
      expect(one.abilities.basic.cost).toEqual({});
    }
  });

  it("keeps every stat above zero where the rules require it", () => {
    for (const one of CAST) {
      expect(one.stats.speed).toBeGreaterThan(0);
      expect(one.stats.maxHp).toBeGreaterThan(0);
      expect(one.stats.critRate).toBeGreaterThanOrEqual(0);
      expect(one.stats.critRate).toBeLessThanOrEqual(100);
    }
  });
});

describe("Johann", () => {
  // The one character with no Soul Essence. The page gives the reason rather
  // than the rules inventing one, and the engine needs no special case: a
  // ceiling of zero simply never fills.
  const johann = ROSTER.get("Johann");

  it("holds no Soul Essence at all", () => {
    expect(johann?.maxEssence).toBe(0);
  });

  it("prices everything but the basic in HP", () => {
    expect(johann?.abilities.skill.cost.hp).toBeGreaterThan(0);
    expect(johann?.abilities.soul.cost.hp).toBeGreaterThan(0);
    expect(johann?.abilities.skill.cost.essence ?? 0).toBe(0);
    expect(johann?.abilities.soul.cost.essence ?? 0).toBe(0);
  });

  it("can survive paying for its own soul", () => {
    // An HP price the character cannot afford is an ability they can never
    // use, which would be a balance mistake hiding as a design one.
    const cost = johann?.abilities.soul.cost.hp ?? 0;
    expect(johann?.stats.maxHp ?? 0).toBeGreaterThan(cost);
  });
});

describe("squadsOf", () => {
  it("gives two squads of four", () => {
    const [left, right] = squadsOf();
    expect(left).toHaveLength(SQUAD_SIZE);
    expect(right).toHaveLength(SQUAD_SIZE);
  });

  it("puts every character in exactly one squad", () => {
    const [left, right] = squadsOf();
    const ids = [...left, ...right].map((one) => one.id);
    expect(new Set(ids).size).toBe(CAST.length);
  });

  it("hands the sim a member and not the archive entry", () => {
    // soul and sources are for a reader of this package. Passing them into a
    // match would put them in every state hash for no reason.
    for (const member of squadsOf().flat()) {
      expect(member).not.toHaveProperty("soul");
      expect(member).not.toHaveProperty("sources");
    }
  });
});

describe("CONTENT_VERSION", () => {
  it("is derived from the content rather than typed by hand", () => {
    expect(CONTENT_VERSION).toBe(digest(CAST));
    expect(CONTENT_VERSION).toMatch(/^[0-9a-f]{16}$/);
  });

  it("changes when a number in the pack changes", () => {
    // This is the whole point of it. A balance change has to be visible to a
    // stored match, or an old replay resolves under new numbers in silence.
    const rebalanced = CAST.map((one, index) =>
      index === 0
        ? { ...one, stats: { ...one.stats, attack: one.stats.attack + 1 } }
        : one,
    );
    expect(digest(rebalanced)).not.toBe(CONTENT_VERSION);
  });
});

describe("the cast in a real match", () => {
  it("starts a match that records which content it was played under", () => {
    const state = createMatch({
      matchId: "content",
      seed: 1,
      squads: squadsOf(),
      contentVersion: CONTENT_VERSION,
    });
    expect(state.contentVersion).toBe(CONTENT_VERSION);
    expect(state.characters).toHaveLength(8);
  });

  it("plays through to a winner", () => {
    let state = createMatch({
      matchId: "content",
      seed: 5,
      squads: squadsOf(),
      contentVersion: CONTENT_VERSION,
    });
    let guard = 0;
    while (state.outcome.kind === "playing" && guard < 400) {
      const actor = nextToAct(state);
      if (actor === null) break;
      const moves = legalMoves(state, actor.owner);
      const attack = moves.find((one) => one.kind === "act");
      const chosen = attack ?? moves[0];
      if (chosen === undefined) break;
      state = resolve(state, [chosen]).state;
      guard += 1;
    }
    expect(state.outcome.kind).toBe("decided");
  });
});
