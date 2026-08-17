---
name: Bug report
about: Report something that does not work as expected
title: ""
labels: bug
assignees: ""
---

## What happened

A clear description of the problem.

## Where

Tick the one that fits.

- [ ] A rule resolved wrongly (`packages/sim`)
- [ ] The turn order put a character in the wrong place
- [ ] The forecast disagreed with what the match went on to do
- [ ] A build, lint, or type check problem
- [ ] Documentation

## Reproducing a rules problem

This is the part that matters most, and it is short.

The rules engine is pure. The same state and the same commands always produce
the same result, so three things reproduce your problem exactly:

- **The starting options.** The `matchId`, the `seed`, and both squads.
- **The commands**, in order.
- **The state hash**, from `hash(state)`, before and after.

```ts
// Paste the options and the commands here.
```

- Hash before:
- Hash after:
- Hash you expected:

If the hash before does not match on another machine, that is a different and
much more serious bug. Say so.

## What you expected

## What actually happened

Copy any error text exactly.

## Your setup

Only needed for a build or type check problem.

- Node version (`node --version`):
- pnpm version (`pnpm --version`):
- Operating system:
- Commit (`git rev-parse --short HEAD`):

## Does `pnpm verify` pass

Run it on a clean clone and paste the last few lines.

    pnpm install --frozen-lockfile
    pnpm verify

A failure here on a clean clone is worth reporting on its own.
