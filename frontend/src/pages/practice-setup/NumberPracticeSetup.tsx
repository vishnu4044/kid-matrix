import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CountSelector } from "../../features/practice/CountSelector";
import { createPractice } from "../../api/practice";

const RANGES: { key: string; label: string }[] = [
  { key: "0-5", label: "Numbers 0-5" },
  { key: "0-9", label: "Numbers 0-9" },
  { key: "1-20", label: "Numbers 1-20" },
  { key: "custom", label: "Custom" },
];

export function NumberPracticeSetup() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState("1-20");
  const [customMin, setCustomMin] = useState(1);
  const [customMax, setCustomMax] = useState(30);
  const [count, setCount] = useState(10);

  const mutation = useMutation({
    mutationFn: () =>
      createPractice({
        child_id: Number(childId),
        type: "numbers",
        count,
        title:
          range === "custom" ? `Numbers ${customMin}-${customMax}` : `Write numbers ${range.replace("-", "-")}`,
        config: { range, custom_min: customMin, custom_max: customMax },
      }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Number Practice</h1>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Select Range</label>
        <div className="grid grid-cols-2 gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-xl border-2 py-3 font-semibold ${
                range === r.key ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              value={customMin}
              onChange={(e) => setCustomMin(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2"
            />
            <span className="text-ink-soft">to</span>
            <input
              type="number"
              value={customMax}
              onChange={(e) => setCustomMax(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2"
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <CountSelector value={count} onChange={setCount} />
      </div>

      <Button className="mt-8" fullWidth onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Start Practice"}
      </Button>
    </Card>
  );
}
