import { type LogLine, tail } from "../lib/log.ts";

/**
 * The rolling combat log.
 *
 * Everything here comes from the sim's events. Some of it exists nowhere
 * else: a critical cannot be recovered by comparing two states, because a
 * critical and an ordinary large hit leave the same HP behind.
 */
export function Log({ lines }: { lines: readonly LogLine[] }) {
  // The band clips rather than counting. However tall it is at this
  // breakpoint, the newest lines fill it from the bottom and the rest scroll
  // off the top, which is what a terminal does and what a fixed line count
  // would get wrong at one size or the other. Twelve is only a ceiling on how
  // much is handed to the browser to clip.
  const recent = tail(lines, 12);
  return (
    <section className="flex h-[88px] shrink-0 flex-col border-t border-mine/16 pt-1.5 md:h-[168px] md:pt-2.5">
      <div className="mb-1 text-[9px] tracking-[0.22em] text-faint/50 md:mb-1.5">LOG</div>
      {/* Lines pile up from the bottom, the way a terminal scrolls. With none
          yet there is nothing to pile, so the empty note sits under the label
          instead of stranded at the foot of an empty band. */}
      <div
        className={`flex min-h-0 grow flex-col gap-0.5 overflow-hidden ${recent.length === 0 ? "justify-start" : "justify-end"}`}
      >
        {recent.length === 0 ? (
          <div className="px-1.5 text-[11px] text-body/30">
            Nothing has happened yet.
          </div>
        ) : null}

        {recent.map((line, index) => {
          const latest = index === recent.length - 1;
          const theirs = line.owner === 1;
          return (
            <div
              key={line.key}
              className={`grid grid-cols-[10px_62px_1fr] items-baseline gap-1.5 px-1.5 py-0.5 text-[10px] md:grid-cols-[30px_10px_74px_96px_1fr] md:gap-2 md:text-[11px] ${
                latest ? (theirs ? "bg-theirs/8" : "bg-mine/8") : ""
              }`}
            >
              <span className="hidden text-faint/40 md:inline">t{line.ordinal}</span>
              <span className={latest ? (theirs ? "text-theirs" : "text-mine") : "text-faint/25"}>
                {latest ? ">" : "·"}
              </span>
              <span
                className={`${theirs ? "text-theirs" : "text-mine"} ${latest ? "font-semibold" : ""}`}
              >
                {line.actor}
              </span>
              <span className={`hidden md:inline ${latest ? "text-body/80" : "text-body/50"}`}>
                {line.ability}
              </span>
              <span className="flex flex-wrap gap-x-3">
                {line.effects.map((effect, at) => {
                  if (effect.kind === "damage") {
                    return (
                      <span key={at} className="text-body/90">
                        {effect.target} -{effect.amount}
                        {effect.critical ? (
                          <span className="ml-1.5 font-semibold text-theirs">CRIT</span>
                        ) : null}
                      </span>
                    );
                  }
                  if (effect.kind === "fell") {
                    return (
                      <span key={at} className="tracking-[0.1em] text-body/55">
                        {effect.target} FALLS
                      </span>
                    );
                  }
                  if (effect.kind === "shared") {
                    return (
                      <span key={at} className="text-mine/70">
                        +{effect.amount} shared
                      </span>
                    );
                  }
                  return (
                    <span key={at} className="font-semibold text-theirs">
                      {effect.winner === null
                        ? "DRAW"
                        : `PLAYER ${effect.winner + 1} WINS`}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
