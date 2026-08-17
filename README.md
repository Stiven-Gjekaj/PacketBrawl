<div align="center">

![PacketBrawl](PacketBrawl.svg)

### A turn based tactical battler for the browser

_Four characters a side. One player each. Speed decides who moves._

[![CI](https://github.com/Stiven-Gjekaj/PacketBrawl/actions/workflows/ci.yml/badge.svg)](https://github.com/Stiven-Gjekaj/PacketBrawl/actions/workflows/ci.yml)

</div>

---

## What this is

PacketBrawl is a 1v1 tactical battler set in the Soultale world. Each player
brings a squad of four characters. Characters act one at a time, in an order
that speed decides across both squads together, so a fast character can act
twice before a slow one acts once. Both players see the order coming.

A match ends when one squad has nobody left standing.

## What runs today

This repository is at milestone M0 of [seven](docs/milestones.md). That
milestone is the skeleton, and the skeleton is finished:

- `packages/sim` resolves commands, orders turns by speed, hashes a state, and
  replays a command log. 812 lines across 9 files.
- 64 tests pass. There is no browser in any of them.
- The package depends on nothing at all, and a test enforces that.

**There is no game to play yet.** There is no user interface, no network, no
account, and no character in the game beyond the ones a test invents. The one
command a player can give is `wait`, which gives up the turn. Nothing deals
damage.

That is the point of M0. The turn engine is the piece every later milestone
sits on, so it is built and proved before anything is drawn on a screen.

## The one architectural rule

`packages/sim` is the whole of the game's logic, and it depends on nothing.

No React, no DOM, no Next.js, no Supabase. No clock, and no random source that
a state does not carry. The client imports it to draw a match and to show a
move at once. The server imports the same module to decide what actually
happened. One implementation of the rules, never two.

The rule is structural rather than advisory:

- The sources are a TypeScript project with no ambient types, so `process`,
  `Buffer`, and `document` do not compile there.
- A test reads every source file and refuses any import that is not a file
  beside it. A list of forbidden packages would miss the package nobody
  thought of. Allowing only a sibling file misses none.
- The same test refuses `Math.random`, `Date.now`, and `new Date`.

If a change to the rules needs a React file touched, the boundary is broken.
Fix the boundary.

## Quick start

Node 26 and pnpm are needed. The Node version is in `.nvmrc`.

```bash
pnpm install
```

Run everything the way CI runs it:

```bash
pnpm verify
```

That is lint, then type check, then the tests. The parts run on their own too:

```bash
pnpm test
```

```bash
pnpm typecheck
```

```bash
pnpm format
```

## How the turn order works

Every character walks the same distance to reach a turn. Speed sets how fast
they walk, so a character with twice the speed arrives twice as often. Nothing
takes a turn in rotation, and nothing is owed a turn because the other side
just had one.

A character of speed 250 reaches turns at 40, 80, and 120. A character of
speed 100 reaches one at 100. So the fast character acts twice, and only then
does the slow one act at all.

The distance is a whole number rather than 10000 divided by speed. A fraction
would be hashed and compared on two machines, and two machines do not have to
agree about the last bit of one.

When two characters arrive together, the side that has waited longer goes
first. Without that rule one squad takes every tie for a whole match.

Nothing acts outside this order. There is no ability that interrupts, so the
list of upcoming turns is a promise rather than an estimate, and a test holds
it to what the match goes on to do.

## Project structure

```
PacketBrawl/
├── packages/
│   └── sim/              the rules. depends on nothing.
│       ├── src/
│       └── test/
├── docs/
│   └── milestones.md     the build order, and what changed from the spec
└── .github/workflows/    lint, type check, test
```

`apps/web`, `packages/content`, and `packages/bot` do not exist yet. They
arrive at the milestones that need them, rather than standing empty until
then.

## Testing

```bash
pnpm test
```

The rules engine needs no browser, which is the whole reason it is kept apart
from anything that draws it.

Two kinds of test are worth naming:

- **Recorded values.** The generator's output and a state hash are pinned to
  the values this implementation produces. A stored match replays through
  both, so changing either invalidates every match recorded before the change.
  That has to be a decision somebody makes, not a side effect of a refactor.
- **The forecast against reality.** The order shown to players is checked
  against the order the match actually takes, over several speed pairings.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and its licence section before
anything else, because this project is not open source and that changes what
contributing means.

[AGENTS.md](AGENTS.md) is the full set of rules: how commits are split, how
text in this repository is written, and who signs a commit.

For help, see [SUPPORT.md](SUPPORT.md). To report a security problem
privately, see [SECURITY.md](SECURITY.md).

## License

**PacketBrawl is not open source.** Copyright (c) 2025-2026 Stiven Gjekaj, all
rights reserved. See [LICENSE](LICENSE) and [TERMS.md](TERMS.md).

You may read this source and fork it inside GitHub, because GitHub's Terms of
Service give every GitHub user that right. You may not use, copy, modify, or
distribute it without written permission. Reading the source grants you no
licence to it.
