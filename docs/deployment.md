<div align="center">
  <a href="../README.md"><img src="../PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Deployment

Where PacketBrawl runs, and the settings that are not in this repository.

## Vercel

The project is `packetbrawl-web`, on the same Vercel team as `soultale-web`.
Every push to `main` deploys it.

**Root Directory is `apps/web`.** It is set, and it must stay set. This is the
one setting that cannot live in the repository: Vercel has no `vercel.json`
field for it, and it is set per project under Settings, Build and Deployment.

A project recreated from scratch needs it again before its first deploy can
work, which is the reason it is written here rather than left in a dashboard
nobody reads twice.

Without it a deploy fails before it builds anything, with:

    No Next.js version detected. Make sure your package.json has "next" in
    either "dependencies" or "devDependencies".

That message is misleading here. `next` is a dependency, of `apps/web`, and
Vercel was reading the workspace root instead. With the Root Directory set,
Vercel finds the app, detects Next, and still installs from the workspace root
so the sim resolves.

**Leave every build override empty.** Build Command, Output Directory and
Install Command are all blank, so Next is detected and its defaults are used.

This matters more than it sounds, because a `vercel.json` that sets them does
not simply stop applying when it is deleted: Vercel writes those values into
the project settings, and they stay. A repository with no `vercel.json` and a
project still carrying `apps/web/.next` as its Output Directory produces a
build that compiles every route and then fails looking for its own output at
`apps/web/apps/web/.next`, because the override is resolved relative to the
Root Directory rather than the repository.

So there is no `vercel.json` here, and there should not be one. Defaults plus
one setting is less to keep in step than defaults plus a file contradicting
them, and a deleted file that leaves its settings behind is worse than
either.

## Node

`.nvmrc`, `engines`, and CI all name Node 24.

The first deploy failed on `>=26`: Vercel's newest Node is 24, so no version
satisfied the range, while CI was green on 26 at the same moment. Two places
named a version, they disagreed, and the wrong one was the one nobody read.
24 is the current long term release and the newest Vercel offers, which makes
it the version every machine can agree on.

## Environment

`.env.example` names what the app needs. Copy it to `.env.local` for local
work, and set the same values in the Vercel dashboard under Settings,
Environment Variables.

| Variable | Where | Secret |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | local and Vercel | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | local and Vercel | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel only, from M4 | **yes** |

The first two ship inside the browser bundle of any Supabase app, and row
level security is what actually protects the data.

The third bypasses row level security completely. It belongs only to the
server routes that write game state, it is never written into a file in this
repository, and it must never carry the `NEXT_PUBLIC_` prefix. That prefix is
what puts a value in the browser bundle, and this is the one value that
landing there would hand every player the ability to write anybody's match.

## Supabase

PacketBrawl shares the `soultale` project and keeps its tables in a
`packetbrawl` schema. [architecture.md](architecture.md) says why, including
what sharing does not protect against.

Migrations live in `supabase/migrations/` and are the source of truth. Apply a
change there first. A change made in the dashboard and not written down is a
change the next reader cannot find.
