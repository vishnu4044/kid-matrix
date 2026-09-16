import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CountSelector } from "../../features/practice/CountSelector";
import { createPractice } from "../../api/practice";

const GROUPS = ["A-F", "G-L", "M-R", "S-Z", "All"];

export function LetterPracticeSetup() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [caseOption, setCaseOption] = useState<"upper" | "lower" | "both">("upper");
  const [group, setGroup] = useState("A-F");
  const [count, setCount] = useState(10);

  const mutation = useMutation({
    mutationFn: () =>
      createPractice({
        child_id: Number(childId),
        type: "letters",
        count,
        title: `${group} Letter Practice`,
        config: { case: caseOption, group },
      }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Letter Practice</h1>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Case</label>
        <div className="flex gap-2">
          {(["upper", "lower", "both"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCaseOption(c)}
              className={`flex-1 rounded-xl border-2 py-2 font-semibold capitalize ${
                caseOption === c ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Select Letters</label>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-xl border-2 px-4 py-2 font-semibold ${
                group === g ? "border-brand-blue bg-brand-blue-light text-brand-blue" : "border-slate-200 text-ink-soft"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
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
