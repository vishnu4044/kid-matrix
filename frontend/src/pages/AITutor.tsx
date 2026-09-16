import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ChildSwitcherBar } from "../features/children/ChildSwitcherBar";
import { useSelectedChild } from "../hooks/useSelectedChild";
import { askTutor } from "../api/ai";
import { fetchChildTutorHistory } from "../api/children";
import { getApiErrorMessage } from "../api/client";

const EXAMPLES = [
  "What should Emma practice today?",
  "What has Emma improved on this month?",
  "Which letters need more practice?",
  "Should we practise numbers or math today?",
];

export function AITutor() {
  const { children, selectedChild, selectedId, selectChild } = useSelectedChild();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ["tutorHistory", selectedId],
    queryFn: () => fetchChildTutorHistory(selectedId!),
    enabled: Boolean(selectedId),
  });

  const mutation = useMutation({
    mutationFn: (q: string) => askTutor({ child_id: selectedId ?? undefined, question: q }),
    onSuccess: () => {
      setQuestion("");
      queryClient.invalidateQueries({ queryKey: ["tutorHistory", selectedId] });
    },
    onError: (err) => setError(getApiErrorMessage(err, "Couldn't reach the AI tutor. Try again.")),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setError(null);
    mutation.mutate(question.trim());
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-light text-2xl">🤖</div>
        <h1 className="font-display text-2xl font-bold text-ink">Ask Your Kid Matrix Tutor</h1>
      </div>

      <div className="mt-4">
        <ChildSwitcherBar children={children} selectedId={selectedId} onSelect={selectChild} />
      </div>
      {selectedChild && (
        <p className="mt-2 text-sm text-ink-soft">
          This conversation is saved for {selectedChild.name} — switch children to see their own history.
        </p>
      )}

      <Card className="mt-4 max-h-96 space-y-3 overflow-y-auto p-4">
        {(!history || history.length === 0) && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-soft">Try asking:</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuestion(ex)}
                  className="block w-full rounded-xl bg-slate-50 px-4 py-2 text-left text-sm text-ink-soft hover:bg-slate-100"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {history?.map((interaction) => (
          <div key={interaction.id} className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl bg-brand-blue px-4 py-2 text-sm text-white">
              {interaction.question}
            </div>
            <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-ink">
              {interaction.response}
            </div>
          </div>
        ))}
        {mutation.isPending && <p className="text-sm text-ink-soft">Thinking...</p>}
      </Card>

      {error && <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
        />
        <Button type="submit" disabled={mutation.isPending}>
          →
        </Button>
      </form>
    </div>
  );
}
