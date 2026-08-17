<div align="center">
  <a href="README.md"><img src="PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

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
- The wordmark as SVG, drawn as a bitmap path so it does not depend on a font
  being installed.
- `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `TERMS.md`, and
  `CODE_OF_CONDUCT.md`.
- [docs/architecture.md](docs/architecture.md), which says how the pieces fit
  and why each decision was taken.
- Issue and pull request templates. A bug report asks for the starting
  options, the commands, and the state hash, which reproduce a rules problem
  exactly.
- A link check over every document, reading Markdown links, `img src`, and
  `a href`. It runs in CI.
- CodeQL analysis, weekly and on every push to the default branch.
- Dependabot for the toolchain and for the actions.

### Changed

- The project is rewritten in TypeScript. The C# terminal battler is gone, and
  no line of it carries over.
- The game is live rather than asynchronous, and turns are sequential rather
  than simultaneous. Both reverse the original specification, and
  [docs/milestones.md](docs/milestones.md) records why.
- **The licence.** The project was MIT and is now proprietary, with all rights
  reserved. The source is readable, which is not the same as free to use.

### Removed

- The Mnemis content pipeline, which described a database that does not exist.
  Content will be hand authored typed TypeScript.
- The raster wordmark, replaced by the SVG.
