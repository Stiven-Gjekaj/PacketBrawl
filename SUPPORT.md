<div align="center">
  <a href="README.md"><img src="PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Getting help

PacketBrawl is at the first milestone of seven.
There is no game to play yet, so most help today is about the plan and about
the rules engine.

## Understand the project

- [README.md](README.md) says what the project is and what runs today.
- [docs/architecture.md](docs/architecture.md) says how the pieces fit, and
  why the turn order and the state hash work the way they do.
- [docs/combat.md](docs/combat.md) says how a hit resolves, what an ability
  costs, and why each rule was chosen over the one beside it.
- [docs/deployment.md](docs/deployment.md) says where it runs, and which
  settings live in a dashboard rather than in this repository.
- [docs/milestones.md](docs/milestones.md) holds the build order, and the
  reason behind each decision that shapes it. It also records the six places
  this project now disagrees with its own original specification.
- [AGENTS.md](AGENTS.md) sets the rules for anybody who changes this
  repository.

## Run what exists

You need Node 24 and pnpm. The Node version is in `.nvmrc`.

    git clone https://github.com/Stiven-Gjekaj/PacketBrawl
    cd PacketBrawl
    pnpm install
    pnpm verify

`pnpm verify` lints, type checks, and runs the tests. It is exactly what CI
runs.

If it fails on a clean clone, that is a bug worth reporting.

## Ask a question or report a problem

- Search the existing
  [issues](https://github.com/Stiven-Gjekaj/PacketBrawl/issues) first, in case
  somebody has already asked.
- If a rule resolves in a way that looks wrong, open an issue. Include the
  state, the commands, and the state hash. Those three let anybody reproduce
  it exactly, which is the whole reason the hash exists.
- If something in the milestones looks wrong, open an issue and name it.
  An argument against a decision that is already made is welcome.

Do not use the issue tracker for a security problem.
See [SECURITY.md](SECURITY.md) for how to report one privately.

## What this project will not answer

- Requests to use the code in your own project. PacketBrawl is proprietary.
  See [LICENSE](LICENSE), and email if you want permission.
- Questions about the Soultale story beyond what the game needs.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).
Read the licence section of it before you write any code, because this project
is not open source and that changes what contributing means.
