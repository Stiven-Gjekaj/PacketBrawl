<div align="center">
  <a href="README.md"><img src="PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Contributing to PacketBrawl

Thanks for your interest in PacketBrawl, a 1v1 tactical battler set in
Soultale.

## Read this first: the licence

**PacketBrawl is not open source.** All rights are reserved. See
[LICENSE](LICENSE).

That changes what contributing means here, so it is said before anything else:

- You may read the source and fork inside GitHub. You may not use the code in
  your own project.
- If you open a pull request, you assign the copyright in your contribution to
  the copyright holder, so the whole work stays under one owner. Do not open
  one if you are not willing to do that.
- A contribution gives you no licence to the rest of the work.

If that is not what you want, an issue is still welcome and costs you nothing.

## What is useful right now

The project is at milestone M0 of seven. There is a rules engine and nothing
else: no interface, no network, no character, and no damage.

So the useful contributions today are small and specific:

- **An argument against a decision.** [docs/milestones.md](docs/milestones.md)
  records six places this project left its own specification behind, with the
  reason for each. If a reason is wrong, say so in an issue.
- **A rule that resolves incorrectly.** Include the state, the commands, and
  the state hash.
- **A hole in the boundary test.** `packages/sim/test/boundary.test.ts` is what
  holds the rules engine to depending on nothing. If you can get an import,
  a global, or a clock past it, that is worth more than a feature.
- **A case the turn order gets wrong.** Two speeds and the order you expected.

Do not build a milestone that is not started. Open an issue first. This costs
you one message and can save you a rewritten pull request.

## Development setup

You need Node 26 and pnpm. The Node version is in `.nvmrc`.

    git clone https://github.com/Stiven-Gjekaj/PacketBrawl
    cd PacketBrawl
    pnpm install
    pnpm verify

`pnpm verify` runs everything that CI runs: lint, then type check, then tests.

## Where a change lives

| Change | Files |
| ------ | ----- |
| The turn order, or the forecast | `packages/sim/src/action-value.ts` |
| The damage a hit deals | `packages/sim/src/damage.ts` |
| What an ability is, and who it reaches | `packages/sim/src/ability.ts` |
| What a state or a command holds | `packages/sim/src/types.ts` |
| Applying a command | `packages/sim/src/resolve.ts` |
| The state hash | `packages/sim/src/hash.ts` |
| The seeded generator | `packages/sim/src/rng.ts` |
| What a match starts as | `packages/sim/src/create-match.ts` |
| Something not built yet | `docs/milestones.md` |

## The rules that catch people

[AGENTS.md](AGENTS.md) is the full set. These five cause the most rework.

- **One change per commit, and a feature is many commits.** A commit that says
  "integrate the full feature" is wrong even when the code is right. Split it
  into steps a reviewer can read and revert one at a time.
- **Code and its tests go in one commit. Documentation goes in its own.**
- **No `Co-Authored-By`, no tool footer, no session link.** A commit shows that
  a human read the code. Set this in your tool's configuration once, not by
  deleting the line each time.
- **All text uses Simplified Technical English.** Short sentences, active
  voice, present tense. No em-dashes and no emoji, in source, comments,
  documentation, or commit messages.
- **Run `pnpm verify` and read its exit code before you commit.** The exit code
  of a pipeline is the exit code of the last command in it, which is rarely the
  one you care about.

## The rule this project lives by

`packages/sim` is the whole of the game's logic and it depends on nothing.

Do not add a dependency to it. Do not widen the `types` or `lib` settings in
`packages/sim/tsconfig.json` to make something compile; those settings are what
stops `document` and `process` reaching the rules. Put the code that needs them
somewhere else.

If a change to the rules needs a React file touched, the boundary is broken.
Fix the boundary, not the symptom.

## Two traps that the design creates

**A change to the generator or the hash invalidates every recorded match.**
Both are pinned to recorded values in the tests. If you change one, that test
fails on purpose. Do not update the recorded value to make it pass. Decide
whether the change is worth ending every replay, and say so in the commit.

**A test can pass for the wrong reason.**
The boundary test reads a directory of source files. It asserts first that the
directory holds something, because a rename would otherwise turn it green
while it checks nothing at all. Write the same guard into anything similar.
