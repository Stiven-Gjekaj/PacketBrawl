import type { Rng } from "./rng.ts";
import { nextInt } from "./rng.ts";
import type { Character, Stats } from "./types.ts";

/**
 * How much a hit takes off.
 *
 * Two stages. The attacker's stat and the ability's power decide what the hit
 * is worth. The defender's matching stat then decides how much of it lands.
 *
 * Every step is integer arithmetic. A fraction would be stored in a state,
 * hashed, and compared on two machines, and two machines do not have to agree
 * about the last bit of one.
 */

/** Which pair of stats settles a hit. */
export type School = "physical" | "magic";

/**
 * The constant that shapes the mitigation curve.
 *
 * Damage taken is K / (K + defence). So defence equal to K halves a hit,
 * and defence never reaches immunity however high it goes.
 *
 *   defence     0   ->  100 of a 100 hit
 *   defence   100   ->   66
 *   defence   200   ->   50
 *   defence   400   ->   33
 *
 * The numbers are what the rule gives after flooring, not the percentages
 * before it. 100 against a defence of 100 is 66 and not 67.
 *
 * The plain alternative, attack minus defence, was refused. It turns a
 * character invulnerable the moment defence meets attack, and it makes one
 * point of a stat worthless at one end of the curve and decisive at the
 * other.
 */
export const MITIGATION_CONSTANT = 200;

/** The stat that lands a hit of this school. */
export function offenceOf(stats: Stats, school: School): number {
  return school === "physical" ? stats.attack : stats.magicAttack;
}

/** The stat that absorbs a hit of this school. */
export function defenceOf(stats: Stats, school: School): number {
  return school === "physical" ? stats.defence : stats.magicDefence;
}

/** What a hit is worth before the defender reduces it. */
export function rawDamage(
  attacker: Stats,
  school: School,
  power: number,
): number {
  if (!Number.isInteger(power) || power < 0) {
    throw new RangeError(
      `An ability power must be a whole number of zero or more, and was ${power}.`,
    );
  }
  return Math.floor((power * offenceOf(attacker, school)) / 100);
}

/** What is left of a hit after the defender's matching stat reduces it. */
export function mitigate(raw: number, defence: number): number {
  if (defence < 0) {
    throw new RangeError(`A defence cannot be below zero, and was ${defence}.`);
  }
  return Math.floor(
    (raw * MITIGATION_CONSTANT) / (MITIGATION_CONSTANT + defence),
  );
}

/** A resolved hit, and the generator that comes after rolling it. */
export interface Hit {
  readonly rng: Rng;
  readonly damage: number;
  readonly critical: boolean;
}

/**
 * Work out one hit, rolling for a critical.
 *
 * The roll draws from the generator the state carries, and gives back the
 * generator that follows, so the same match replays to the same hits. This is
 * the first rule that consumes a random number, which is why the generator
 * has been part of the state since before anything used it.
 *
 * A hit that lands takes at least one HP. A defender who reduced every hit to
 * nothing could not be killed by anybody, whatever the rest of the rules say.
 */
export function strike(
  rng: Rng,
  attacker: Character,
  defender: Character,
  school: School,
  power: number,
): Hit {
  const raw = rawDamage(attacker.stats, school, power);
  const landed = mitigate(raw, defenceOf(defender.stats, school));

  const roll = nextInt(rng, 100);
  const critical = roll.value < attacker.stats.critRate;
  const withCrit = critical
    ? Math.floor((landed * (100 + attacker.stats.critDamage)) / 100)
    : landed;

  return {
    rng: roll.rng,
    damage: Math.max(1, withCrit),
    critical,
  };
}
