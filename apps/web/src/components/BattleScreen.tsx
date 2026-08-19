"use client";

import { useMatch } from "../lib/store.ts";
import { actions as actionsOf, cards as cardsOf, onTurn, rail as railOf } from "../lib/view.ts";
import { ActionBar } from "./ActionBar.tsx";
import { Card } from "./Card.tsx";
import { Log } from "./Log.tsx";
import { Pips } from "./Pips.tsx";
import { Rail } from "./Rail.tsx";

/**
 * The whole match on one screen.
 *
 * Two players, one keyboard. The board does not flip between turns: a screen
 * that rearranged itself every time the turn passed would cost the player
 * holding the keyboard more than the labels save them.
 */
export function BattleScreen() {
  const state = useMatch((s) => s.state);
  const lines = useMatch((s) => s.lines);
  const pending = useMatch((s) => s.pending);
  const aimed = useMatch((s) => s.aimed);
  const refused = useMatch((s) => s.refused);
  const choose = useMatch((s) => s.choose);
  const aim = useMatch((s) => s.aim);
  const fire = useMatch((s) => s.fire);
  const cancel = useMatch((s) => s.cancel);
  const restart = useMatch((s) => s.restart);

  const acting = onTurn(state);
  const board = cardsOf(state, pending, aimed);
  const upcoming = railOf(state, 7);
  const available = actionsOf(state);
  const decided = state.outcome.kind === "decided";

  const aimingAt = pending === null ? null : available.find((a) => a.slot === pending.slot);
  const targetSide = aimingAt?.needsTarget === true ? (acting === 0 ? 1 : 0) : null;

  const side = (owner: 0 | 1) => board.filter((c) => c.owner === owner);

  const header = (owner: 0 | 1) => {
    const player = state.players[owner];
    const live = acting === owner && !decided;
    return (
      <div className="flex items-center gap-3.5">
        <span
          className={`text-[11px] font-semibold tracking-[0.2em] ${
            owner === 1 ? "text-theirs" : "text-mine"
          } ${live ? "" : "opacity-45"}`}
        >
          PLAYER {owner + 1}
        </span>
        {live ? (
          <span className="text-[9px] tracking-[0.18em] text-body/70">ON TURN</span>
        ) : null}
        <span className="text-[10px] tracking-[0.14em] text-faint/40">SHARED</span>
        <Pips
          filled={player.sharedEssence}
          total={player.maxSharedEssence}
          tone={owner === 1 ? "theirs" : "mine"}
        />
      </div>
    );
  };

  return (
    <main className="scanlines relative mx-auto flex h-dvh w-full max-w-[1800px] flex-col overflow-hidden bg-ink">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-mine/20 bg-panel px-3 md:gap-3 md:px-4.5">
        <span className="text-[12px] font-semibold tracking-[0.18em] text-mine">
          &gt; PACKETBRAWL
        </span>
        <span className="text-[11px] tracking-[0.1em] text-faint/45">
          hotseat · turn {state.actionOrdinal}
        </span>
        <span className="grow" />
        <span className="hidden text-[11px] tracking-[0.1em] text-faint/45 lg:inline">
          full information · no interrupts
        </span>
      </header>

      <div className="flex min-h-0 grow flex-col md:flex-row">
        <Rail entries={upcoming} />

        <div className="flex min-h-0 grow flex-col px-2.5 pt-3 pb-3 md:px-6 md:pt-4 md:pb-4">
          <div className="flex min-h-0 flex-1 flex-col justify-start md:justify-center">
          <div className="mb-2.5 flex items-center justify-between">
            {header(1)}
            <span className="hidden text-[10px] tracking-[0.14em] text-theirs/55 sm:inline">
              ← FRONT OF LINE
            </span>
          </div>

          <div className="flex justify-center gap-1.5 md:gap-4">
            {side(1).map((card) => (
              <Card
                key={card.id}
                card={card}
                pickable={targetSide === 1 && card.mood !== "fallen"}
                onPick={() => fire(card.id)}
                onAim={(over) => aim(over ? card.id : null)}
              />
            ))}
          </div>

          <div className="my-3 flex items-center gap-3 md:my-5 md:gap-4">
            <div className="h-px grow bg-mine/18" />
            <div className="text-[9px] tracking-[0.2em] text-faint/40 md:text-[10px] md:tracking-[0.28em]">
              {pending === null ? (
                <>
                  <span className="md:hidden">BLAST HITS THREE</span>
                  <span className="hidden md:inline">
                    BLAST · TARGET AND BOTH NEIGHBOURS
                  </span>
                </>
              ) : (
                `AIMING · ${aimingAt?.name?.toUpperCase() ?? ""}`
              )}
            </div>
            <div className="h-px grow bg-mine/18" />
          </div>

          <div className="flex justify-center gap-1.5 md:gap-4">
            {side(0).map((card) => (
              <Card
                key={card.id}
                card={card}
                pickable={targetSide === 0 && card.mood !== "fallen"}
                onPick={() => fire(card.id)}
                onAim={(over) => aim(over ? card.id : null)}
              />
            ))}
          </div>

          <div className="mt-2.5">{header(0)}</div>
          </div>

          <Log lines={lines} />

          {refused !== null ? (
            <div className="mb-2 border border-theirs/50 bg-theirs/10 px-3 py-2 text-[11px] text-theirs">
              The rules refused that move: {refused}
            </div>
          ) : null}

          {decided ? (
            <div className="mt-3 mb-1 flex items-center gap-4 border border-theirs bg-theirs/12 px-4 py-3">
              <span className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[0.14em] text-theirs">
                {state.outcome.kind === "decided" && state.outcome.winner === null
                  ? "A DRAW"
                  : `PLAYER ${(state.outcome.kind === "decided" ? (state.outcome.winner ?? 0) : 0) + 1} WINS`}
              </span>
              <span className="grow" />
              <button
                type="button"
                onClick={() => restart(Math.floor(Date.now() % 100000))}
                className="cursor-pointer border border-mine/50 px-3 py-1.5 text-[11px] tracking-[0.14em] text-mine hover:border-mine"
              >
                PLAY AGAIN
              </button>
            </div>
          ) : (
            <div className="mt-3 mb-1">
              <ActionBar
                actions={available}
                chosen={pending?.slot ?? null}
                onChoose={choose}
              />
              {pending !== null && aimingAt?.needsTarget === true ? (
                <button
                  type="button"
                  onClick={cancel}
                  className="mt-2 cursor-pointer text-[10px] tracking-[0.14em] text-faint/50 hover:text-faint"
                >
                  pick a target above, or cancel
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
