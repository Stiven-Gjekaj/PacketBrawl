<div align="center">
  <a href="../README.md"><img src="../PacketBrawl.svg" alt="PacketBrawl" width="420"></a>
</div>

# Combat

How a hit resolves, what an ability costs, and why each rule was chosen over
the one beside it.

Every number here is a starting point, not a balanced one. Balance is a later
job and it is a job with playtests behind it.

## The stat block

Eight numbers.

| Stat | What it does |
| --- | --- |
| maxHp | How much a character takes before falling |
| attack | Lands a physical hit |
| defence | Absorbs a physical hit |
| magicAttack | Lands a magic hit |
| magicDefence | Absorbs a magic hit |
| speed | How often the character reaches a turn |
| critRate | The chance of a critical, as a percentage |
| critDamage | What a critical adds, as a percentage |

An ability names the school it belongs to, so both pairs earn their place
rather than one shadowing the other.

Status effect stats are absent. Nothing reads one yet, and a field nothing
reads drifts out of step with the rules without a test noticing.

## Damage

Two stages, integers throughout.

    raw    = floor(power * attackStat / 100)
    damage = floor(raw * K / (K + defenceStat))        K = 200

`power` is the ability's percentage of the attacker's stat. A hit that lands
always takes at least one HP.

What defence buys, against a raw hit of 100:

| defence | taken |
| --- | --- |
| 0 | 100 |
| 100 | 66 |
| 200 | 50 |
| 400 | 33 |

Those are the numbers after flooring, not the percentages before it. 100
against a defence of 100 is 66, not 67.

### Why not attack minus defence

Subtraction is easier to read and a player can do it in their head. It was
still refused, for two reasons.

It creates immunity. The moment defence reaches attack, a character cannot be
hurt by that attacker at all, and no amount of the rest of the design fixes
that.

It makes a stat point mean different things at different places on the curve.
One point of defence is worthless while defence is far below attack, and
decisive when it is near it. A player cannot reason about a stat that behaves
that way, and a designer cannot balance one.

The ratio has neither problem. Defence has diminishing returns and never
reaches immunity, and a point of attack is worth the same proportionally
wherever a character stands. A test drives defence to ten million and confirms
something still gets through.

## Turns

Speed alone decides who acts, across both squads together. See
[architecture.md](architecture.md) for the action value rule and the tie
break.

Nothing acts outside that order. There is no interrupt and no reaction, which
is what lets the forecast be a promise to both players rather than an
estimate.

## The three actions

A turn is spent on one of these, or on waiting.

| Action | Costs | Gives |
| --- | --- | --- |
| Basic | nothing | damage, and one to the shared pool |
| Skill | one from the shared pool | the character's real ability |
| Soul | the character's own Essence | the largest effect |
| Wait | nothing | nothing but the Essence a turn gives |

The shared pool starts empty. So the opening turn of a match can only wait or
use a basic, and somebody has to spend a turn funding the squad before anybody
spends one on a skill.

That is the decision the two resources exist to create. Without the basic, the
shared pool is not a decision but a timer.

## Essence

A character's own Essence fills two ways:

- **One for spending a turn**, whatever the turn was spent on, waiting
  included. A character who cannot act usefully is still building towards the
  turn where they can.
- **One for being hit**, however hard the hit was.

Filling on being hit is what gives a durable character a role beyond
surviving. They charge faster because they are being attacked.

A character whose Essence ceiling is zero never gains any. That is not a
special case in the rules. It falls out of the ceiling, and it is what makes a
character who pays only in blood work.

## What an ability is

    cost:   { shared?, essence?, hp? }
    target: single | blast | all | self | ally | allAllies
    school: physical | magic
    power:  a percentage of the attacking stat

An ability may price itself in any mix of the three currencies. This is what
lets two characters of one class play nothing alike while the rules know
nothing about either:

| Character | How it is written |
| --- | --- |
| Pays HP to strike harder | `cost: { hp: 15 }` |
| Has no Essence at all, everything costs blood | `maxEssence: 0`, every ability priced in `hp` |

Neither needs the engine to know about them.

### Paying cannot kill

An HP price must leave the character alive, so a cost equal to full HP is
refused rather than resolved.

The alternative leaves the rules answering questions nobody asked. Does the
ability still land when its user died paying for it? Has a squad emptied by
its own turn lost? Refusing the payment removes both questions instead of
answering them badly.

### Costs are paid first

Pay, then act, then gain. Paying first is what stops an ability funding itself
out of the Essence its own hit generates.

## Position

Squad order runs from the front of the line at slot 0 to the back at slot 3.

`blast` catches the target and whoever stands either side of them. That is
what makes the order a position rather than a label, and it makes arranging a
squad a decision.

A fallen character leaves a gap rather than closing the line up, so standing
beside a casualty is safer. That is a consequence a player can play around. It
would have been an accident of list filtering if the slots were read after the
dead were removed.

## Critical hits

A critical is rolled per hit from the generator the state carries, so a match
replays to the same criticals.

This was argued against and then chosen. The argument against: variance hides
whether a loss came from a bad decision or a bad roll, and M1 exists to answer
exactly that question about the design.

It is worth writing down that **crit is the first thing to take back out** if
M1 reads as random rather than tactical. It is two stats and one line.

## What a resolved command reports

`resolve` gives back the state and an account of how it was reached.

    acted         who spent the turn, on which slot, and the ability's name
    hit           source, target, damage, and whether it was a critical
    fell          a character reached zero HP on this action
    sharedGained  what a basic put into the squad's shared pool
    decided       the match ended, and who won

A state cannot be read backwards into these. A critical hit and an ordinary
large hit leave exactly the same HP behind, so no comparison of two states
tells them apart. `strike` knows which it was, and without this it would throw
that away.

A fall is reported after every hit of the action rather than beside the hit
that caused it. A wide attack that kills two characters landed both hits at
the same moment, and a death between them would say otherwise.

**The events are not part of the state and never reach `hash`.** A match is
its commands. The events are what those commands are read to mean, so
rewording a report costs nothing, while hashing one would void every recorded
match.

## What is not built

- Healing, buffs, and status effects. An ability aimed at the actor's own side
  currently costs what it costs and does nothing else.
- Any real character. Every ability in the tests is invented by that test.
- Turn limits, and therefore any draw by exhaustion. A match ends only when a
  squad is emptied.
