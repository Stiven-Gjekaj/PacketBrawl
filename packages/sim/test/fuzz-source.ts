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

function randomStats(rng: Rng): [Stats, Rng] {
  let r = rng;
  let maxHp: number;
  let attack: number;
  let defence: number;
  let magicAttack: number;
  let magicDefence: number;
  let speed: number;
  let critRate: number;
  let critDamage: number;
  [maxHp, r] = between(r, 40, 220);
  [attack, r] = between(r, 20, 180);
  [defence, r] = between(r, 0, 400);
  [magicAttack, r] = between(r, 20, 180);
  [magicDefence, r] = between(r, 0, 400);
  // Speed spans a wide range on purpose: the turn order is the part most
  // likely to break, and a fast character against a slow one is where it
  // does. One is the lowest a speed may be.
  [speed, r] = between(r, 1, 400);
  [critRate, r] = between(r, 0, 100);
  [critDamage, r] = between(r, 0, 300);
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
    r,
  ];
}

function randomAbility(
  rng: Rng,
  id: string,
  slot: Ability["slot"],
): [Ability, Rng] {
  let r = rng;
  let shapeAt: number;
  let schoolAt: number;
  let power: number;
  let priceKind: number;
  let amount: number;
  [shapeAt, r] = between(r, 0, SHAPES.length - 1);
  [schoolAt, r] = between(r, 0, SCHOOLS.length - 1);
  [power, r] = between(r, 0, 250);
  [priceKind, r] = between(r, 0, 3);
  [amount, r] = between(r, 1, 4);

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
    r,
  ];
}

function randomMember(rng: Rng, id: string): [SquadMember, Rng] {
  let r = rng;
  let stats: Stats;
  let ceiling: number;
  let basic: Ability;
  let skill: Ability;
  let soul: Ability;
  [stats, r] = randomStats(r);
  // A ceiling of zero is a character who pays only in blood, and it must
  // appear often enough that the fuzzer actually walks that path.
  [ceiling, r] = between(r, 0, 4);
  [basic, r] = randomAbility(r, `${id}-basic`, "basic");
  [skill, r] = randomAbility(r, `${id}-skill`, "skill");
  [soul, r] = randomAbility(r, `${id}-soul`, "soul");
  return [
    { id, stats, maxEssence: ceiling, abilities: { basic, skill, soul } },
    r,
  ];
}

/** A whole match, decided entirely by one number. */
export function randomOptions(seed: number): MatchOptions {
  let r = createRng(seed);
  const squad = (prefix: string): SquadMember[] => {
    const members: SquadMember[] = [];
    for (let index = 0; index < 4; index += 1) {
      let member: SquadMember;
      [member, r] = randomMember(r, `${prefix}${index}`);
      members.push(member);
    }
    return members;
  };
  return {
    matchId: `fuzz-${seed}`,
    seed,
    squads: [squad("a"), squad("b")],
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
