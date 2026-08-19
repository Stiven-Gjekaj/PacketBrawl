import { CONTENT_VERSION, squadsOf } from "@packetbrawl/content";
import type { MatchOptions } from "@packetbrawl/sim";

/**
 * The match a hotseat begins from.
 *
 * The characters come from `packages/content`, which is written by hand,
 * committed to git and hashed into a version every match records. Nothing
 * about them is decided here.
 */
export function soultaleMatch(seed: number): MatchOptions {
  return {
    matchId: "hotseat",
    seed,
    squads: squadsOf(),
    contentVersion: CONTENT_VERSION,
  };
}
