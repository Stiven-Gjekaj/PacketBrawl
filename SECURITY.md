<div align="center">
  <a href="README.md"><b>PacketBrawl</b></a>
</div>

# Security Policy

## Supported versions

PacketBrawl is at the first milestone of seven and has no release.
When it has one, fixes go to the latest version on the default branch.
Older versions are not maintained.

## Reporting a vulnerability

Report security problems privately, and not through a public issue.

- Preferred: open a private security advisory with the "Report a
  vulnerability" button on the Security tab of this repository.
- Alternative: email the maintainer at stivenagostingjekaj@gmail.com.

Include the steps to reproduce, the affected commit, and the impact as you
understand it.
You can expect a first answer within a few days.
Your report gets an acknowledgement when the fix ships, unless you prefer to
stay anonymous.

## The threat model

Read this before you report, because the shape of the project decides what
counts.

**Today there is no server and no account.**
The repository holds a rules engine and its tests. There is no interface, no
network code, no database, and nothing deployed.
So a report about a hosted service is early rather than wrong. Keep it until
milestone M4 exists.

**The rules engine is the thing worth attacking.**
Once matches are played against another person, the server resolves every
command and never trusts a client.
Anything that breaks that arrangement is the highest severity problem this
project can have.

**These are in scope now:**

- A command that `legalMoves` refuses but `resolve` accepts. That is the exact
  gap a cheating client walks through, because the server checks the first and
  applies the second.
- Any way to make `resolve` produce a different state from the same starting
  state and the same commands. A match that does not replay cannot be audited.
- Any way to make two machines disagree about `hash` for one state.
- An import, a global, or a clock reading inside `packages/sim` that
  `packages/sim/test/boundary.test.ts` does not catch. That test is what holds
  the rules to being pure, so a hole in it is a hole in everything above.
- A crafted command log that makes `replay` loop without end or exhaust
  memory. Replays run on the server.

**These are in scope once the milestones that create them land:**

- Reading or writing a match that is not yours.
- Acting out of turn, or acting as the other player's character.
- Anything that lets a client write game state directly.

**These are out of scope:**

- A missing security header on a site that does not exist yet.
- A report that there is no login and no rate limit. There is no server. That
  is the current state, not a defect.
- A balance problem. A character that is too strong is a design issue, so open
  a normal issue for it.
- A dependency warning against a package that only the tests use, with no path
  to anything that runs.
