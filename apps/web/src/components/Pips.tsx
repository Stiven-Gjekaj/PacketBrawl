/** A row of diamonds, filled to `filled`. Essence, and the shared pool. */
export function Pips({
  filled,
  total,
  tone,
}: {
  filled: number;
  total: number;
  tone: "mine" | "theirs" | "lime";
}) {
  const colour =
    tone === "mine" ? "bg-mine" : tone === "theirs" ? "bg-theirs" : "bg-lime";
  const edge =
    tone === "mine"
      ? "border-mine/40"
      : tone === "theirs"
        ? "border-theirs/40"
        : "border-lime/40";
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`size-[7px] rotate-45 md:size-[9px] ${index < filled ? colour : `border ${edge}`}`}
        />
      ))}
    </span>
  );
}
