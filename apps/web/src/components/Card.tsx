"use client";

import type { CardView } from "../lib/view.ts";
import { Pips } from "./Pips.tsx";

// The card shares the row rather than owning a fixed width, so a wider window
// gets a bigger board instead of a bigger margin. The ceiling stops four cards
// sprawling across an ultrawide screen.
const SIZE = "max-w-[340px]";

const PAD = "px-1.5 pt-1.5 pb-2 md:px-3 md:pt-2 md:pb-3";

const FRAME: Record<CardView["mood"], string> = {
  acting: "border-2 border-mine bg-mine/12 shadow-[0_0_24px_rgb(74_222_128/0.30)]",
  target: "border-2 border-theirs bg-theirs/16 shadow-[0_0_24px_rgb(251_191_36/0.30)]",
  splash: "border border-theirs/60 bg-theirs/8",
  reachable: "border border-theirs/45 bg-theirs/4 hover:border-theirs",
  unreachable: "border border-theirs/20",
  idle: "border border-mine/30 bg-mine/4",
  fallen: "border border-mine/15 opacity-50",
};

export function Card({
  card,
  onPick,
  onAim,
  pickable,
}: {
  card: CardView;
  pickable: boolean;
  onPick: () => void;
  onAim: (over: boolean) => void;
}) {
  const theirs = card.owner === 1;
  const ink = card.mood === "fallen" ? "text-body/45" : theirs ? "text-theirs" : "text-mine";

  const body = (
    <>
      <div
        className={`portrait flex aspect-[5/4] max-h-[150px] min-h-[46px] items-center justify-center border-b font-[family-name:var(--font-display)] text-[clamp(15px,4.5vw,34px)] md:aspect-[16/7] md:min-h-[58px] md:text-[clamp(21px,3vw,34px)] ${theirs ? "border-theirs/45" : "border-mine/30"} ${ink}`}
      >
        {card.initial}
      </div>
      <div className={PAD}>
        <div className="flex items-baseline gap-1 md:gap-2">
          <span
            className={`truncate font-[family-name:var(--font-display)] text-[10px] font-semibold md:text-[15px] ${ink}`}
          >
            {card.name}
          </span>
          <span className={`hidden text-[9px] tracking-[0.1em] sm:inline ${theirs ? "text-theirs/45" : "text-mine/45"}`}>
            {String(card.slot + 1).padStart(2, "0")}
          </span>
        </div>
        <div
          className={`mt-1 hidden h-3 overflow-hidden text-[9px] tracking-[0.14em] md:mt-1.5 md:block ${
            card.mood === "acting" || card.mood === "target"
              ? `${ink} font-semibold`
              : "text-faint/65"
          }`}
        >
          {card.note}
        </div>
        <div className="mt-1 h-[6px] border border-mine/20 bg-[#0a1a12] md:mt-1.5 md:h-[7px]">
          <div
            className={`h-full ${theirs ? "bg-theirs" : "bg-mine"}`}
            style={{ width: `${card.hpPercent}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between gap-1 md:mt-1.5">
          <span className="text-[9px] text-body/75 md:text-[10px]">
            {card.hp}/{card.maxHp}
          </span>
          {/* A character with no Essence at all shows no pips rather than three
              empty ones, because an empty track reads as "not charged yet". */}
          {card.maxEssence > 0 ? (
            <Pips
              filled={card.essence}
              total={card.maxEssence}
              tone={card.essence === card.maxEssence ? "theirs" : "lime"}
            />
          ) : (
            <span className="text-[8px] tracking-[0.1em] text-body/35 md:text-[9px] md:tracking-[0.12em]">
              BLOOD
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (!pickable) {
    return (
      <div className={`min-w-0 flex-1 basis-0 ${SIZE} ${FRAME[card.mood]}`}>{body}</div>
    );
  }

  return (
    <button
      type="button"
      className={`min-w-0 flex-1 basis-0 cursor-pointer text-left ${SIZE} ${FRAME[card.mood]}`}
      onClick={onPick}
      onMouseEnter={() => onAim(true)}
      onMouseLeave={() => onAim(false)}
      onFocus={() => onAim(true)}
      onBlur={() => onAim(false)}
    >
      {body}
    </button>
  );
}
