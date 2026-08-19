"use client";

import type { ActionView } from "../lib/view.ts";
import { Pips } from "./Pips.tsx";

export function ActionBar({
  actions,
  chosen,
  onChoose,
}: {
  actions: readonly ActionView[];
  chosen: string | null;
  onChoose: (slot: ActionView["slot"]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
      {actions.map((action) => {
        const soul = action.slot === "soul";
        const picked = chosen === action.slot;
        const tone = !action.affordable
          ? "border-mine/12 text-body/25"
          : soul
            ? "border-theirs bg-theirs/12 text-theirs"
            : picked
              ? "border-mine bg-mine/16 text-mine"
              : "border-mine/40 bg-panel text-mine hover:border-mine";

        return (
          <button
            key={action.slot}
            type="button"
            disabled={!action.affordable}
            onClick={() => onChoose(action.slot)}
            className={`flex min-h-[56px] flex-col justify-center overflow-hidden border px-2.5 py-2 text-left md:grow md:px-3.5 md:py-3 ${tone} ${
              action.affordable ? "cursor-pointer" : "cursor-not-allowed"
            } ${picked ? "ring-1 ring-mine/60" : ""}`}
          >
            <div
              className={`flex items-baseline justify-between gap-2 ${action.affordable ? "" : "opacity-30"}`}
            >
              <span
                className={`text-[12px] font-semibold tracking-[0.13em] uppercase ${
                  soul ? "font-[family-name:var(--font-display)] text-[13px]" : ""
                }`}
              >
                {action.slot}
              </span>
              {action.cost.essence > 0 ? (
                <Pips filled={action.cost.essence} total={action.cost.essence} tone="theirs" />
              ) : action.cost.shared > 0 ? (
                <Pips filled={action.cost.shared} total={action.cost.shared} tone="mine" />
              ) : null}
            </div>
            <div
              className={`mt-1 line-clamp-2 text-[9px] md:mt-1.5 md:line-clamp-none md:text-[10px] ${action.affordable ? "text-body/65" : "text-body/25"}`}
            >
              {action.name === "Wait" ? action.detail : `${action.name} - ${action.detail}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
