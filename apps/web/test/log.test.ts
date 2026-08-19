import { createMatch, type MatchEvent, nextToAct, resolve } from "@packetbrawl/sim";
import { describe, expect, it } from "vitest";
import { tail, toLines } from "../src/lib/log.ts";
import { placeholderMatch } from "../src/lib/squads.ts";

const ownerOf = (id: string) =>
  ["WARDEN", "EMBER", "THORN", "VEIL"].includes(id) ? (0 as const) : (1 as const);

describe("toLines", () => {
  it("gives nothing back for nothing", () => {
    expect(toLines([], ownerOf)).toEqual([]);
  });

  it("makes one line per action and gathers its effects onto it", () => {
    const events: MatchEvent[] = [
      { kind: "acted", ordinal: 0, character: "THORN", action: "skill", ability: "Thornfall" },
      { kind: "hit", source: "THORN", target: "CINDER", damage: 40, critical: false },
      { kind: "hit", source: "THORN", target: "HOLLOW", damage: 61, critical: true },
      { kind: "fell", character: "CINDER" },
      { kind: "acted", ordinal: 1, character: "GLASS", action: "basic", ability: "Shard" },
      { kind: "hit", source: "GLASS", target: "THORN", damage: 22, critical: false },
      { kind: "sharedGained", player: 1, amount: 1 },
    ];
    const lines = toLines(events, ownerOf);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.ability).toBe("Thornfall");
    expect(lines[0]?.effects).toHaveLength(3);
    expect(lines[1]?.actor).toBe("GLASS");
    expect(lines[1]?.owner).toBe(1);
  });

  // The reason the event stream exists. A critical leaves the same HP behind
  // as an ordinary large hit, so nothing but the event knows it happened.
  it("carries a critical through to the line", () => {
    const lines = toLines(
      [
        { kind: "acted", ordinal: 0, character: "GLASS", action: "skill", ability: "Shatterstep" },
        { kind: "hit", source: "GLASS", target: "THORN", damage: 70, critical: true },
      ],
      ownerOf,
    );
    const effect = lines[0]?.effects[0];
    expect(effect?.kind === "damage" && effect.critical).toBe(true);
  });

  it("reads a wait as a line with no effects", () => {
    const lines = toLines(
      [{ kind: "acted", ordinal: 3, character: "VEIL", action: "wait", ability: null }],
      ownerOf,
    );
    expect(lines[0]?.ability).toBe("waits");
    expect(lines[0]?.effects).toEqual([]);
  });

  // resolve always reports the action first, so this cannot arrive from the
  // sim. Attaching it to a line that does not exist would be a worse answer
  // than dropping it.
  it("drops an effect that arrives before any action", () => {
    const lines = toLines(
      [{ kind: "hit", source: "A", target: "B", damage: 1, critical: false }],
      ownerOf,
    );
    expect(lines).toEqual([]);
  });

  it("gives every line a key that does not repeat", () => {
    const state = createMatch(placeholderMatch(4));
    const actor = nextToAct(state);
    const first = resolve(state, [
      { kind: "act", character: actor?.id ?? "", slot: "basic", target: "CINDER" },
    ]);
    const next = nextToAct(first.state);
    const second = resolve(first.state, [
      { kind: "act", character: next?.id ?? "", slot: "basic", target: "THORN" },
    ]);
    const lines = toLines([...first.events, ...second.events], ownerOf);
    expect(new Set(lines.map((l) => l.key)).size).toBe(lines.length);
  });
});

describe("the log against a real match", () => {
  it("describes what the sim actually reported", () => {
    const state = createMatch(placeholderMatch(7));
    const actor = nextToAct(state);
    const step = resolve(state, [
      { kind: "act", character: actor?.id ?? "", slot: "basic", target: "CINDER" },
    ]);
    const lines = toLines(step.events, ownerOf);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.actor).toBe(actor?.id);
    // A basic hits once and fills the pool, so the line carries both.
    const kinds = lines[0]?.effects.map((e) => e.kind) ?? [];
    expect(kinds).toContain("damage");
    expect(kinds).toContain("shared");
  });
});

describe("tail", () => {
  const line = (n: number) => ({
    key: `k${n}`,
    ordinal: n,
    actor: "A",
    owner: 0 as const,
    ability: "x",
    effects: [],
  });

  it("keeps the most recent lines, which is all a band can show", () => {
    const all = [1, 2, 3, 4, 5].map(line);
    expect(tail(all, 3).map((l) => l.ordinal)).toEqual([3, 4, 5]);
  });

  it("gives back everything when there is less than asked for", () => {
    expect(tail([line(1)], 6)).toHaveLength(1);
  });
});
