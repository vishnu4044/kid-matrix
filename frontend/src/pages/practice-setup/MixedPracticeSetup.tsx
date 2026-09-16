import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CountSelector } from "../../features/practice/CountSelector";
import { createPractice } from "../../api/practice";

const SUBJECTS = [
  { key: "letters", label: "Letters" },
  { key: "numbers", label: "Numbers" },
  { key: "shapes", label: "Shapes" },
  { key: "math", label: "Math" },
];

export function MixedPracticeSetup() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<string[]>(["letters", "math"]);
  const [count, setCount] = useState(10);

  const toggle = (key: string) => {
    setSubjects((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const mutation = useMutation({
    mutationFn: () =>
      createPractice({
        child_id: Number(childId),
        type: "mixed",
        count,
        title: "Mixed Practice",
        config: { subjects },
      }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Mixed Practice</h1>
      <p className="mt-1 text-ink-soft">Combine multiple skills in one session.</p>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Include</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`rounded-xl border-2 px-4 py-2 font-semibold ${
                subjects.includes(s.key) ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <CountSelector value={count} onChange={setCount} />
      </div>

      <Button
        className="mt-8"
        fullWidth
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || subjects.length === 0}
      >
        {mutation.isPending ? "Creating..." : "Start Practice"}
      </Button>
    </Card>
  );
}
