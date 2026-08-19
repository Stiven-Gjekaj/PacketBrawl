<div align="center">
  <a href="../README.md"><img src="../PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Architecture

How PacketBrawl is put together, and why each piece is where it is.

This describes what exists. [milestones.md](milestones.md) describes what does
not.

## The shape

```
packages/sim/          the rules. depends on nothing.
├── src/
│   ├── types.ts           what a match, a character, and a command are
│   ├── rng.ts             the seeded generator
│   ├── action-value.ts    who acts next, and the forecast
│   ├── damage.ts          what a hit takes off, and the critical roll
│   ├── ability.ts         what an ability costs, and who it reaches
│   ├── create-match.ts    the state a match starts from
│   ├── resolve.ts         applying a command, and the win rule
│   ├── events.ts          what a resolved command reports
│   ├── replay.ts          a starting point plus a log, back to a state
│   ├── hash.ts            a state written as one comparable string
│   └── version.ts         the rules version and the content version
└── test/
    └── boundary.test.ts   holds the package to depending on nothing
```

Nothing else exists yet. `apps/web`, `packages/content`, and `packages/bot`
arrive at the milestones that need them.

## The one rule

**The rules engine depends on nothing.**

No framework, no DOM, no clock, and no random source a state does not carry.

Three things follow from it, and each is the reason it is worth keeping:

- The **client** imports it to draw a match and to show a move at once.
- The **server** imports the same module to decide what actually happened.
  One implementation of the rules, never two, so the two cannot drift.
- **Tests** run it in Node with no browser. Balance work needs no interface.

### How the rule is held

A rule written in a document is a rule until somebody is in a hurry. This one
is held in two places instead.

**By the type system.** `packages/sim/tsconfig.json` sets `types: []` and a
`lib` with nothing host specific in it. So `process`, `Buffer`, and `document`
do not merely break a guideline in the rules engine. They do not compile.

The tests are a separate TypeScript project that does have Node, because one
of them reads the source files off disk.

**By a test.** `boundary.test.ts` reads every source file and refuses any
import that is not a file beside it.

It allows rather than forbids, and that choice is the whole value of it. A
list of banned packages reports success while an import nobody thought of sits
in the file. Allowing only a sibling file catches every one of them, including
the packages this project has not met yet.

The same test refuses `Math.random`, `Date.now`, and `new Date`, which are not
imports and so cannot be caught the same way. It reads the code with comments
stripped, because the comment in `rng.ts` that names the call it refuses
contains that call's name.

It asserts first that it found sources to read. Without that, a renamed
directory turns the whole check green while it enforces nothing.

## Turn order

Every character walks the same distance to reach a turn. Speed sets how fast
they walk.

    actionValue = floor(10000 * 1000 / speed)

The living character with the smallest remaining distance acts next. After
acting, that character starts the walk again.

Nothing takes a turn in rotation, and nothing is owed a turn because the other
side just had one. A character of speed 250 reaches turns at 40, 80, and 120
while a character of speed 100 reaches one at 100, so the fast one acts twice
before the slow one acts at all.

### Why the distance is a whole number

`10000 / speed` is a fraction. A fraction gets stored, hashed, and compared on
two machines, and two machines do not have to agree about the last bit of one.

Scaling by a thousand and taking the floor leaves nothing to disagree about,
and still separates speeds one apart: 137 and 138 give different distances.

### Ties

Two characters can arrive together. The rule is:

1. Smaller remaining distance.
2. The side that has waited longer, by `lastActionOrdinal`.
3. The front of the squad.
4. The lower player slot.

Rule 2 is the one that matters. Without it, one squad takes every tie for a
whole match, and squad order alone decides a match between two teams of equal
speed. Rules 3 and 4 only settle the opening between two identical squads.

### The forecast

`forecast(state, count)` walks the same rules forward without changing
anything, and returns the characters due to act.

It is exact, not an estimate. Nothing acts outside the turn order, so the only
thing that can change the forecast is a change to a speed, and that happens on
a turn the forecast already shows. A test holds it to the order the match goes
on to take.

That property is why an interrupting ability is a larger decision than it
looks. It would make the sidebar lie.

## Determinism

A match is a starting point and a list of commands. The state is derived.

**The generator is part of the state.** A draw takes a generator and returns a
value and the next generator, so nothing holds hidden position. It is
mulberry32: every step is 32 bit integer arithmetic, so it gives the same
numbers on every engine.

`nextInt` throws away draws that land in the short last block rather than
taking the remainder, which would favour the low values, because 2^32 divides
evenly by almost no bound worth rolling.

**The hash is canonical.** `hash(state)` sorts object keys before hashing,
because `JSON.stringify` writes them in insertion order, so a state built
field by field and the same state built by spreading another would hash
differently while holding equal values.

It writes negative zero as itself, because `String(-0)` is `"0"`. It writes an
absent field apart from a field holding `undefined`, because `JSON.stringify`
drops both.

It folds UTF-16 code units rather than calling `TextEncoder`, which is a host
global. Declaring that global to TypeScript would mean widening the lib until
`document` is declared too, which is the exact import this package exists to
refuse.

**Both are pinned.** The generator's output and a state hash are recorded in
tests. A change to either invalidates every match recorded before it, so that
has to be a decision somebody makes rather than a side effect of a refactor.

## Server authority

This is the design M4 builds, not code that exists.

Clients never write game state. Every mutation goes through a route handler
that:

1. Verifies the caller is the acting player.
2. Validates the command against `legalMoves()`.
3. Appends to an append-only command log, which is the source of truth.
4. Resolves, and writes the derived state as a cache.

`legalMoves` and `resolve` are separate functions, and the gap between them is
the thing to watch. A command the first refuses and the second accepts is the
exact hole a cheating client walks through. `SECURITY.md` names it in scope.

The original specification also described a `pending_moves` table and row
level security to hide a move until both players had chosen. Turns are
sequential now, so none of that is needed. PacketBrawl is a full information
game.

## Content

Characters and abilities are not database rows. They are typed TypeScript,
committed to git, and hashed into a `content_version`.

Postgres stores what players did. Git stores what the game is. So a balance
change is a pull request with a diff, and every match records the
`content_version` and `sim_version` it was played under, which keeps an old
replay valid after a rebalance.

The specification had this generated from a Mnemis SQLite database. That
database does not exist, so the content is hand authored. Every property above
survives the change; only the generator is gone.
