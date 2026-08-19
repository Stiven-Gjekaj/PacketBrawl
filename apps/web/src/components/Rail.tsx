import type { RailEntry } from "../lib/view.ts";

/**
 * The turn forecast, shown to both players.
 *
 * It is exact rather than an estimate. Nothing acts outside the turn order,
 * so the only thing that can change this list is a change to a speed, and
 * that happens on a turn the list already shows.
 */
export function Rail({ entries }: { entries: readonly RailEntry[] }) {
  const repeats = entries.filter(
    (one, index) => entries.findIndex((other) => other.id === one.id) !== index,
  );

  return (
    <aside className="flex w-full shrink-0 flex-row items-center gap-1.5 overflow-hidden border-b border-mine/20 bg-rail px-2.5 py-2 md:w-[132px] md:flex-col md:gap-2 md:border-r md:border-b-0 md:px-0 md:py-4">
      <div className="shrink-0 text-[9px] tracking-[0.18em] text-faint/55 md:mb-1 md:text-[10px] md:tracking-[0.22em]">
        NEXT
      </div>

      {entries.map((entry, index) => {
        const theirs = entry.owner === 1;
        const first = index === 0;
        return (
          <div
            key={`${entry.id}-${index}`}
            className={`flex min-w-0 flex-1 items-center gap-1.5 md:w-[100px] md:flex-none md:gap-2 ${
              index > 3 ? "hidden md:flex" : ""
            }`}
            style={{ opacity: first ? 1 : Math.max(0.4, 1 - index * 0.09) }}
          >
            <div
              className={`w-1 shrink-0 ${first ? "h-8 md:h-[50px]" : "h-7 md:h-[38px]"} ${theirs ? "bg-theirs" : "bg-mine"}`}
            />
            <div
              className={`flex min-w-0 grow flex-col items-center justify-center ${first ? "h-8 md:h-[50px]" : "h-7 md:h-[38px]"} border ${
                theirs ? "border-theirs/45" : "border-mine/45"
              } ${first ? (theirs ? "bg-theirs/14" : "bg-mine/14") : ""}`}
            >
              <span
                className={`truncate px-1 font-[family-name:var(--font-display)] tracking-[0.06em] ${
                  first
                    ? "text-[11px] font-bold md:text-[14px]"
                    : "text-[10px] md:text-[12px]"
                } ${theirs ? "text-theirs" : "text-mine"}`}
              >
                {entry.name}
              </span>
              {first ? (
                <span
                  className={`hidden text-[9px] tracking-[0.1em] md:inline ${theirs ? "text-theirs/70" : "text-mine/70"}`}
                >
                  SPD {entry.speed}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}

      {repeats.length > 0 ? (
        <div className="mt-2 hidden w-[104px] text-center text-[9px] leading-relaxed tracking-[0.12em] text-faint/60 md:block">
          {repeats[0]?.name} TWICE
          <br />
          IN THIS WINDOW
        </div>
      ) : null}
    </aside>
  );
}
