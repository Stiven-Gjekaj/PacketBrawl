# Changelog

Every notable change to PacketBrawl.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

Milestone M0, the skeleton. See [docs/milestones.md](docs/milestones.md).

### Added

- `packages/sim`, the rules engine. It depends on nothing, and a test holds it
  to that.
- A seeded generator that carries its position inside the state, so a match
  replays exactly. Its output is pinned to recorded values.
- Turn order by action value. Speed decides who acts next across both squads
  together, and enough speed buys a second action before a slow character
  takes one.
- A forecast of the upcoming turns, checked against what the match goes on to
  do.
- A canonical state hash, so a client and the server find a disagreement by
  comparing one string.
- `resolve`, `legalMoves`, and `replay`.
- Continuous integration that lints, type checks, and tests every push.

### Changed

- The project is rewritten in TypeScript. The C# terminal battler is gone, and
  no line of it carries over.
- The game is live rather than asynchronous, and turns are sequential rather
  than simultaneous. Both reverse the original specification, and
  [docs/milestones.md](docs/milestones.md) records why.

### Removed

- The Mnemis content pipeline, which described a database that does not exist.
  Content will be hand authored typed TypeScript.
