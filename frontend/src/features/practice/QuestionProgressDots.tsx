type DotState = "pending" | "current" | "correct" | "wrong";

export function QuestionProgressDots({
  total,
  currentIndex,
  results,
}: {
  total: number;
  currentIndex: number;
  results: (boolean | null)[];
}) {
  const stateFor = (i: number): DotState => {
    if (results[i] === true) return "correct";
    if (results[i] === false) return "wrong";
    if (i === currentIndex) return "current";
    return "pending";
  };

  const styles: Record<DotState, string> = {
    correct: "bg-brand-green text-white",
    wrong: "bg-brand-pink text-white",
    current: "bg-brand-blue text-white animate-progress-dot-pop",
    pending: "bg-slate-200 text-transparent",
  };

  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const state = stateFor(i);
        return (
          <span
            key={i}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${styles[state]}`}
          >
            {state === "correct" ? "★" : state === "wrong" ? "•" : ""}
          </span>
        );
      })}
    </div>
  );
}
