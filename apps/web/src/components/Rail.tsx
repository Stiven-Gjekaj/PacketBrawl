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
    <aside className="flex w-[132px] shrink-0 flex-col items-center gap-2 border-r border-mine/20 bg-rail py-4">
      <div className="mb-1 text-[10px] tracking-[0.22em] text-faint/55">NEXT</div>

      {entries.map((entry, index) => {
        const theirs = entry.owner === 1;
        const first = index === 0;
        return (
          <div
            key={`${entry.id}-${index}`}
            className="flex w-[100px] items-center gap-2"
            style={{ opacity: first ? 1 : Math.max(0.4, 1 - index * 0.09) }}
          >
            <div
              className={`w-1 ${first ? "h-[50px]" : "h-[38px]"} ${theirs ? "bg-theirs" : "bg-mine"}`}
            />
            <div
              className={`flex grow flex-col items-center justify-center ${first ? "h-[50px]" : "h-[38px]"} border ${
                theirs ? "border-theirs/45" : "border-mine/45"
              } ${first ? (theirs ? "bg-theirs/14" : "bg-mine/14") : ""}`}
            >
              <span
                className={`font-[family-name:var(--font-display)] tracking-[0.06em] ${
                  first ? "text-[14px] font-bold" : "text-[12px]"
                } ${theirs ? "text-theirs" : "text-mine"}`}
              >
                {entry.name}
              </span>
              {first ? (
                <span
                  className={`text-[9px] tracking-[0.1em] ${theirs ? "text-theirs/70" : "text-mine/70"}`}
                >
                  SPD {entry.speed}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}

      {repeats.length > 0 ? (
        <div className="mt-2 w-[104px] text-center text-[9px] leading-relaxed tracking-[0.12em] text-faint/60">
          {repeats[0]?.name} TWICE
          <br />
          IN THIS WINDOW
        </div>
      ) : null}
    </aside>
  );
}
