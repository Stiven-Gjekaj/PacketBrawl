## Summary

Describe what this pull request changes, and why.

## Related issue

Link the issue this addresses, if there is one (for example, "Closes #12").

## Changes

-

## Testing

Say how you checked the change. All of these pass locally:

- [ ] `pnpm verify` exits 0, and I read the exit code rather than the output
- [ ] `bash scripts/check-links.sh`

## Checklist

- [ ] Each commit holds one change. A feature is many commits, not one.
- [ ] The code and its tests are in the same commit.
- [ ] The documentation is in its own commit.
- [ ] Every commit builds and passes on its own, so a reader can stop at any
      one of them.
- [ ] Every subject line is in the present tense, carries a type prefix, and
      carries no version number.
- [ ] There is no `Co-Authored-By` line, no tool footer, and no session link.
- [ ] All text uses Simplified Technical English. No em-dashes, and no emoji.

## If this touches `packages/sim`

Leave this section blank if it does not.

- [ ] No new dependency. The package still depends on nothing.
- [ ] The `types` and `lib` settings in `packages/sim/tsconfig.json` are
      unchanged. Widening them to make something compile removes the wall that
      keeps `document` and `process` out of the rules.
- [ ] No `Math.random`, no clock, and no value the state does not carry.
- [ ] The change ships with tests.

## If this changes the generator or the state hash

Leave this section blank if it does not. Both are pinned to recorded values,
so their tests fail on purpose when you touch them.

**Do not update a recorded value to make a test pass.** A stored match replays
through both, so a change to either ends every replay recorded before it.

- [ ] I intend to invalidate every recorded match, and the commit message says
      so.
