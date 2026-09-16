import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { generateAIPractice } from "../../api/ai";
import { getApiErrorMessage } from "../../api/client";

const EXAMPLES = [
  "Give Emma 10 addition questions",
  "Create A-F letter practice",
  "Give Emma 15 number-writing questions from 1-20",
  "Create kindergarten math practice",
];

export function AIPracticeGenerator() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => generateAIPractice({ child_id: Number(childId), prompt }),
    onSuccess: (session) => navigate(`/practice/${session.id}/ready`),
    onError: (err) => setError(getApiErrorMessage(err, "Couldn't generate practice. Try again.")),
  });

  return (
    <Card className="mx-auto max-w-xl p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-light text-2xl">
          🤖
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Ask Kid Matrix</h1>
      </div>
      <p className="mt-2 text-ink-soft">Describe what you want to create.</p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Give Emma 10 addition questions for Kindergarten level"
        className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
      />

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-ink-soft">Examples:</p>
        <div className="space-y-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="block w-full rounded-xl bg-slate-50 px-4 py-2 text-left text-sm text-ink-soft hover:bg-slate-100"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}

      <Button
        className="mt-6"
        fullWidth
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        disabled={mutation.isPending || prompt.trim().length < 3}
      >
        {mutation.isPending ? "Generating..." : "Generate Practice"}
      </Button>
    </Card>
  );
}
