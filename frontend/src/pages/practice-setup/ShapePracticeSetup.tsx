import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CountSelector } from "../../features/practice/CountSelector";
import { createPractice } from "../../api/practice";

const SHAPES = [
  { key: "circle", label: "Circle", icon: "⚪" },
  { key: "square", label: "Square", icon: "⬜" },
  { key: "triangle", label: "Triangle", icon: "🔺" },
  { key: "rectangle", label: "Rectangle", icon: "▭" },
];

export function ShapePracticeSetup() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(["circle", "square", "triangle", "rectangle"]);
  const [count, setCount] = useState(10);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const mutation = useMutation({
    mutationFn: () =>
      createPractice({
        child_id: Number(childId),
        type: "shapes",
        count,
        title: "Shape Practice",
        config: { shapes: selected },
      }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Shape Practice</h1>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Select Shapes</label>
        <div className="grid grid-cols-4 gap-3">
          {SHAPES.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 ${
                selected.includes(s.key) ? "border-brand-blue bg-brand-blue-light" : "border-slate-200"
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-semibold text-ink-soft">{s.label}</span>
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
        disabled={mutation.isPending || selected.length === 0}
      >
        {mutation.isPending ? "Creating..." : "Start Practice"}
      </Button>
    </Card>
  );
}
