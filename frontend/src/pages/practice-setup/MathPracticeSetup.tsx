import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CountSelector } from "../../features/practice/CountSelector";
import { createPractice } from "../../api/practice";

const OPERATIONS: { key: string; label: string }[] = [
  { key: "addition", label: "Addition" },
  { key: "subtraction", label: "Subtraction" },
  { key: "multiplication", label: "Multiplication" },
  { key: "division", label: "Division" },
];

const DIFFICULTIES = [
  { key: "beginner", label: "Kindergarten (Easy)" },
  { key: "intermediate", label: "Grade 1-2 (Medium)" },
  { key: "advanced", label: "Grade 3+ (Hard)" },
];

export function MathPracticeSetup() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [operation, setOperation] = useState("addition");
  const [difficulty, setDifficulty] = useState("beginner");
  const [count, setCount] = useState(10);

  const mutation = useMutation({
    mutationFn: () =>
      createPractice({
        child_id: Number(childId),
        type: "math",
        count,
        difficulty,
        title: `${operation[0].toUpperCase()}${operation.slice(1)} Practice`,
        config: { operation },
      }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Math Practice</h1>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Operation Type</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.key}
              onClick={() => setOperation(op.key)}
              className={`rounded-xl border-2 py-3 font-semibold ${
                operation === op.key ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <CountSelector value={count} onChange={setCount} />
      </div>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <Button className="mt-8" fullWidth onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Start Practice"}
      </Button>
    </Card>
  );
}
