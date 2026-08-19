import type { LogLine } from "../lib/log.ts";

/**
 * The rolling combat log.
 *
 * Everything here comes from the sim's events. Some of it exists nowhere
 * else: a critical cannot be recovered by comparing two states, because a
 * critical and an ordinary large hit leave the same HP behind.
 */
export function Log({ lines }: { lines: readonly LogLine[] }) {
  return (
    <section className="flex h-[168px] shrink-0 flex-col border-t border-mine/16 pt-2.5">
      <div className="mb-1.5 text-[9px] tracking-[0.22em] text-faint/50">LOG</div>
      {/* Lines pile up from the bottom, the way a terminal scrolls. With none
          yet there is nothing to pile, so the empty note sits under the label
          instead of stranded at the foot of an empty band. */}
      <div
        className={`flex min-h-0 grow flex-col gap-0.5 ${lines.length === 0 ? "justify-start" : "justify-end"}`}
      >
        {lines.length === 0 ? (
          <div className="px-1.5 text-[11px] text-body/30">
            Nothing has happened yet.
          </div>
        ) : null}

        {lines.map((line, index) => {
          const latest = index === lines.length - 1;
          const theirs = line.owner === 1;
          return (
            <div
              key={line.key}
              className={`grid grid-cols-[30px_10px_74px_96px_1fr] items-baseline gap-2 px-1.5 py-0.5 text-[11px] ${
                latest ? (theirs ? "bg-theirs/8" : "bg-mine/8") : ""
              }`}
            >
              <span className="text-faint/40">t{line.ordinal}</span>
              <span className={latest ? (theirs ? "text-theirs" : "text-mine") : "text-faint/25"}>
                {latest ? ">" : "·"}
              </span>
              <span
                className={`${theirs ? "text-theirs" : "text-mine"} ${latest ? "font-semibold" : ""}`}
              >
                {line.actor}
              </span>
              <span className={latest ? "text-body/80" : "text-body/50"}>{line.ability}</span>
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
