<div align="center">
  <a href="../README.md"><img src="../PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Milestones

The build order, what is finished, and where this project left its original
specification behind.

Each milestone ships and is tested before the next one starts.

## The order

| | Milestone | State |
|---|---|---|
| M0 | Skeleton. The rules package, its types, a resolve, and tests. No UI, no network. | Done |
| M1 | Local hotseat. Full combat playable in a browser, two players one keyboard, state in memory. | Rules done, no interface |
| M2 | Determinism harness. Replay tests and fuzzing over random legal commands, asserting no crash and no divergence. | Not started |
| M3 | Accounts. Auth, profiles, the squad builder, persistence. | Not started |
| M4 | Live matches. Server routes, the command log, realtime, per turn deadlines. | Not started |
| M5 | Bots. At minimum a greedy one ply evaluator. | Not started |
| M6 | Matchmaking, rating, and replays. | Not started |

M1 is the milestone that decides whether the game is any good. Nothing after
it starts until it is fun.

## What M0 delivered

- A seeded generator that carries its position in the state, so a match
  replays exactly.
- The action value turn order. Speed decides who acts next across both squads
  together, and enough speed buys a second action before a slow character
  takes one.
- A forecast of upcoming turns, checked by test against what the match goes on
  to do.
- A canonical state hash, so a client and the server can find a disagreement
  by comparing one string.
- `resolve`, `legalMoves`, and `replay`.
- The package boundary, enforced by the type system and by a test rather than
  by a promise.

M0 shipped with no damage, no ability, no character, and no interface. Its
only command was `wait`.

## What M1 has so far

The combat rules are written and tested. [combat.md](combat.md) records them
and the reasoning behind each one.

- The damage rule, a ratio curve that never reaches immunity.
- Critical hits, rolled from the generator the state carries.
- Abilities, priced in any mix of shared pool, Essence, and HP.
- The three actions: basic, skill, and soul.
- Essence, filling on acting and on being hit.
- Targeting by position, including a blast that catches both neighbours.
- The event stream. `resolve` reports what happened as well as the state it
  reached, which is what a combat log needs and what no comparison of two
  states could recover.

**There is still no interface**, and no character that a test did not invent.
M1 is not finished until two people can play a match in a browser and the
match is worth playing.

## Where this left the specification

The original spec was written before several design questions were answered.
These are the places the project now disagrees with it, and why.

### The game is live, not asynchronous

The spec argued that asynchronous play was a deliberate constraint rather than
a compromise, because the audience is small and scattered across timezones.

Four characters a side on an action gauge is roughly thirty to forty
individual actions in a match, not the five to ten turns the spec assumed. As
asynchronous round trips that is a match measured in days.

The consequence is that **bots matter more, not less**. A live only game with
a scattered audience is unplayable alone, so M5 is closer to essential than
the spec's ordering suggests.

### Turns are sequential, not simultaneous

Speed orders every character across both squads. That removes the spec's
`pending_moves` table, the row level security that hid a move until both
players had chosen, and the claim that hidden information exists at all.
PacketBrawl is a full information game.

### Squads are four, and position means something

The spec offered three as a guess. It is four. Squad order runs from the front
of the line to the back, and that order decides who an attack reaches.

### There is no Mnemis content pipeline

The spec described `packages/content` as generated TypeScript, produced by
`tools/mnemis-export` reading an existing Mnemis SQLite continuity database.

No such database exists. The Mnemis repository holds a plan and no code.

Content will be hand authored typed TypeScript instead, committed to git and
hashed into a `content_version`. Every property the spec wanted survives: a
balance change is a pull request with a diff, and Postgres still stores only
what players did while git stores what the game is. Only the generator is
gone, so `tools/mnemis-export/` is not in the repository structure.

### The schema is not written yet

The spec said `supabase/migrations/0001_init.sql` was already written and
should be read before writing queries. It does not exist. It gets written at
M3, and it will not carry the `pending_moves` table.

### replay takes the match options, not a seed

The spec wrote `replay(seed, commands)`. A seed does not imply two squads of
four, and the squads decide the whole match, so `replay` takes the options a
match begins from. The seed is one of them.

### Biome, not ESLint

The spec called for an ESLint rule banning `Math.random`. This repository uses
Biome, matching the other repositories here.

The ban is enforced better than a lint rule would manage. The sources are a
TypeScript project with no ambient types, and a test allows only relative
imports rather than naming packages to refuse.

### The project is called PacketBrawl

The spec's directory listing called it `soultale-battler`. The repository, the
packages, and the game are all PacketBrawl.

## Still open

These block later milestones and are not decided yet.

- **Spoiler policy.** Which arc the game is set in, and whether the content
  leaks plot to readers of the story.
- **Status effect stats.** Eight stats exist, listed in
  [combat.md](combat.md). Nothing models a status effect yet, so the stats one
  would need are not in the code. They get added when an ability needs one
  rather than before.
- **What the team building helper does.** Whether it warns about a missing
  role, suggests a pairing, or builds a squad outright.
- **Whether subclasses are mechanical.** Classes are felt rather than named in
  the interface. Whether a subclass is a rule or only design vocabulary is not
  settled.
- **The visual direction.** The wordmark is drawn, and it sets the direction:
  a terminal frame, scanlines, and a cursor, with a gold that no phosphor
  display produces. How that carries into a board, a squad, and the turn
  forecast is not decided.
