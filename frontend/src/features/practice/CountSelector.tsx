const COUNTS = [5, 10, 15, 20];

export function CountSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink-soft">Number of questions</label>
      <div className="flex gap-2">
        {COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-xl border-2 py-3 text-center font-bold ${
              value === n ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
