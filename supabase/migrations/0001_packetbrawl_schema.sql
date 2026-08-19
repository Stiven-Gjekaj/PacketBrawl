-- PacketBrawl shares the Soultale database, in a schema of its own.
--
-- Sharing means one account works on readsoultale.com and in the game, which
-- the whole design leans on: the audience is small and scattered, and a
-- reader of the story is already a player.
--
-- The schema is what stops that being reckless. Two projects growing tables
-- in `public` collide on the first common name, and a migration written for
-- one arrives in the other's namespace. A named schema makes the boundary a
-- thing Postgres enforces rather than a thing everybody remembers.
--
-- It does NOT isolate the blast radius. One database is one database: a bad
-- migration or a wrong role grant still reaches both. That risk is accepted
-- on purpose, not overlooked.

create schema if not exists packetbrawl;

comment on schema packetbrawl is
  'PacketBrawl game data. Shares this database with Soultale, and stays out of public so the two cannot collide.';

-- The API roles need to see the schema before they can see anything in it.
-- Every table added later still decides for itself, through row level
-- security, who may read or write it. Usage on the schema grants nothing
-- about its contents.
grant usage on schema packetbrawl to anon, authenticated, service_role;

-- Nothing is created in here yet. Tables arrive at M3, when accounts do.
-- This migration exists so that the namespace is taken and every later
-- migration is additive rather than a rearrangement.
