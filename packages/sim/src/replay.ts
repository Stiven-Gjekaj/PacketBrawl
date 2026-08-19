import { createMatch, type MatchOptions } from "./create-match.ts";
import type { ResolveResult } from "./events.ts";
import { resolve } from "./resolve.ts";
import type { Command } from "./types.ts";

/**
 * Rebuild a match from its beginning and its command log.
 *
 * The command log is what a match actually is. The state is derived from it,
 * so a stored match is a starting point plus a list of commands, and this
 * turns that back into a state.
 *
 * The project spec writes this as `replay(seed, commands)`. A seed alone is
 * not enough now that a match is four characters a side: the squads decide
 * the whole match and no seed implies them. It takes the same options that
 * begin a match instead, which carry the seed among them.
 *
 * It reports the events as well as the state, so a recorded match can be read
 * back turn by turn rather than only landed on at its end.
 */
export function replay(
  options: MatchOptions,
  commands: readonly Command[],
): ResolveResult {
  return resolve(createMatch(options), commands);
}
