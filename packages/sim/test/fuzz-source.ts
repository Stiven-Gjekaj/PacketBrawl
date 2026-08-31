import {
  type Ability,
  type Command,
  createMatch,
  createRng,
  type GameState,
  legalMoves,
  type MatchOptions,
  nextInt,
  nextToAct,
  type Rng,
  resolve,
  type School,
  type SquadMember,
  type Stats,
  type TargetShape,
} from "../src/index.ts";
import { checkState, checkStep } from "./invariants.ts";

/**
 * Fuzzing over random legal command sequences.
 *
 * The fuzzer is itself seeded. A failure that cannot be reproduced is a
 * rumour, so every match here is a pure function of one number, and a report
 * is that number rather than a description.
 *
 * It plays only what `legalMoves` offers, which makes this a test of the gap
 * between the two halves of the rules: anything the first hands over and the
 * second refuses shows up here as a thrown error.
 */

const SHAPES: TargetShape[] = ["single", "blast", "all", "self", "allAllies"];
const SCHOOLS: School[] = ["physical", "magic"];

/** Draw an integer in [low, high]. */
function between(rng: Rng, low: number, high: number): [number, Rng] {
  const draw = nextInt(rng, high - low + 1);
  return [low + draw.value, draw.rng];
}

/**
 * A cursor over one generator.
 *
 * The generator is pure, so carrying it by hand costs a `let` for every value
 * drawn and a reassignment for every draw. The cursor holds that one moving
 * part in a single closure and hands back plain values, which lets each drawn
 * thing be a `const` and puts one draw on one line.
 *
 * The order of the draws is the whole match: change it and every seed builds
 * a different squad. This moves only where the generator is held, never when
 * it advances.
 */
interface Cursor {
  /** Draw an integer in [low, high]. */
  between(low: number, high: number): number;
  /** Run anything that takes a generator and returns one. */
  take<T>(step: (rng: Rng) => [T, Rng]): T;
  /** The generator as it now stands, to hand back to the caller. */
  readonly rng: Rng;
}

function cursor(rng: Rng): Cursor {
  let r = rng;
  return {
    between(low: number, high: number): number {
      const [value, next] = between(r, low, high);
      r = next;
      return value;
    },
    take<T>(step: (rng: Rng) => [T, Rng]): T {
      const [value, next] = step(r);
      r = next;
      return value;
    },
    get rng(): Rng {
      return r;
    },
  };
}

function randomStats(rng: Rng): [Stats, Rng] {
  const draw = cursor(rng);
  const maxHp = draw.between(40, 220);
  const attack = draw.between(20, 180);
  const defence = draw.between(0, 400);
  const magicAttack = draw.between(20, 180);
  const magicDefence = draw.between(0, 400);
  // Speed spans a wide range on purpose: the turn order is the part most
  // likely to break, and a fast character against a slow one is where it
  // does. One is the lowest a speed may be.
  const speed = draw.between(1, 400);
  const critRate = draw.between(0, 100);
  const critDamage = draw.between(0, 300);
  return [
    {
      maxHp,
      attack,
      defence,
      magicAttack,
      magicDefence,
      speed,
      critRate,
      critDamage,
    },
    draw.rng,
  ];
}

function randomAbility(
  rng: Rng,
  id: string,
  slot: Ability["slot"],
): [Ability, Rng] {
  const draw = cursor(rng);
  const shapeAt = draw.between(0, SHAPES.length - 1);
  const schoolAt = draw.between(0, SCHOOLS.length - 1);
  const power = draw.between(0, 250);
  const priceKind = draw.between(0, 3);
  const amount = draw.between(1, 4);

  const cost =
    slot === "basic"
      ? {}
      : priceKind === 0
        ? { shared: amount }
        : priceKind === 1
          ? { essence: amount }
          : priceKind === 2
            ? { hp: amount * 9 }
            : { shared: 1, hp: amount * 5 };

  return [
    {
      id,
      name: id,
      slot,
      cost,
      target: SHAPES[shapeAt] ?? "single",
      school: SCHOOLS[schoolAt] ?? "physical",
      power,
    },
    draw.rng,
  ];
}

function randomMember(rng: Rng, id: string): [SquadMember, Rng] {
  const draw = cursor(rng);
  const stats = draw.take(randomStats);
  // A ceiling of zero is a character who pays only in blood, and it must
  // appear often enough that the fuzzer actually walks that path.
  const ceiling = draw.between(0, 4);
  const basic = draw.take((r) => randomAbility(r, `${id}-basic`, "basic"));
  const skill = draw.take((r) => randomAbility(r, `${id}-skill`, "skill"));
  const soul = draw.take((r) => randomAbility(r, `${id}-soul`, "soul"));
  return [
    { id, stats, maxEssence: ceiling, abilities: { basic, skill, soul } },
    draw.rng,
  ];
}

/** A whole match, decided entirely by one number. */
export function randomOptions(seed: number): MatchOptions {
  const draw = cursor(createRng(seed));
  const squad = (prefix: string): SquadMember[] => {
    const members: SquadMember[] = [];
    for (let index = 0; index < 4; index += 1) {
      members.push(draw.take((r) => randomMember(r, `${prefix}${index}`)));
    }
    return members;
  };
  // Left before right: squad "a" draws first, and the squads differ because
  // of it.
  const a = squad("a");
  const b = squad("b");
  return {
    matchId: `fuzz-${seed}`,
    seed,
    squads: [a, b],
  };
}

export interface Played {
  readonly options: MatchOptions;
  readonly commands: Command[];
  readonly final: GameState;
  readonly steps: number;
}

/**
 * Play one match, choosing only from what the rules offer.
 *
 * `preferAction` picks an attack over a wait where one is on offer, which is
 * how a match is driven to its end. Without it a fuzzer can wait forever and
 * a termination test would only be measuring luck.
 */
export function play(
  seed: number,
  preferAction: boolean,
  maxSteps = 400,
): Played {
  const options = randomOptions(seed);
  let state = createMatch(options);
  checkState(state, `seed ${seed} start`);

  const commands: Command[] = [];
  // A generator of its own, so choosing a move never disturbs the one the
  // match draws its criticals from.
  let rng = createRng(seed + 0x9e3779b9);
  let steps = 0;

  while (state.outcome.kind === "playing" && steps < maxSteps) {
    const actor = nextToAct(state);
    if (actor === null) break;

    const moves = legalMoves(state, actor.owner);
    if (moves.length === 0) break;

    const pool = preferAction
      ? moves.filter((one) => one.kind === "act")
      : moves;
    const from = pool.length > 0 ? pool : moves;

    const pick = nextInt(rng, from.length);
    rng = pick.rng;
    const command = from[pick.value];
    if (command === undefined) break;

    const before = state;
    const step = resolve(state, [command]);
    state = step.state;

    commands.push(command);
    checkState(state, `seed ${seed}`);
    checkStep(before, state, `seed ${seed}`);
    steps += 1;
  }

  return { options, commands, final: state, steps };
}
