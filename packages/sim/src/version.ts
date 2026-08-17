/**
 * The version of the rules, and the version of the content they read.
 *
 * Every match records both. A match resolved under one set of rules must
 * still replay the same way after the rules change, so a stored match names
 * the versions it was played under and the reader refuses rather than
 * guessing when it does not have them.
 */

/** The rules in this package. Raise it when a resolved match would change. */
export const SIM_VERSION = "0.1.0";

/**
 * The characters and abilities the rules read.
 *
 * There is no content package yet, so this names its absence rather than
 * naming a version that does not exist. The value changes to the hash of the
 * content pack when that pack lands.
 */
export const CONTENT_VERSION = "none";
