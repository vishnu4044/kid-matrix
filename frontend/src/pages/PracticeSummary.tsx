import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchPracticeResults } from "../api/practice";
import { fetchChild } from "../api/children";
import { Spinner } from "../components/Spinner";

export function PracticeSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["practiceResults", sessionId],
    queryFn: () => fetchPracticeResults(Number(sessionId)),
    enabled: Boolean(sessionId),
  });
  const session = data?.session;
  const results = data?.results ?? [];

  const { data: child } = useQuery({
    queryKey: ["child", session?.child_id],
    queryFn: () => fetchChild(session!.child_id),
    enabled: Boolean(session),
  });

  if (isLoading || !session) return <Spinner label="Loading results..." />;

  const correct = session.correct_count ?? results.filter((r) => r.is_correct).length;
  const accuracy = session.score ?? 0;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-extrabold text-ink">Today's Practice</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-light text-2xl">
            {child?.avatar || "🙂"}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">{child?.name}</h2>
            <p className="text-ink-soft">{session.title}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-ink">{session.total_questions}</p>
            <p className="text-sm text-ink-soft">Questions</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-brand-green">{correct}</p>
            <p className="text-sm text-ink-soft">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">{accuracy}%</p>
            <p className="text-sm text-ink-soft">Accuracy</p>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h3 className="font-display text-lg font-bold text-ink">Question by Question</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Every attempt is remembered here and factored into {child?.name ?? "their"} progress.
        </p>
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div
              key={r.question_id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                r.is_correct ? "bg-brand-green-light" : "bg-brand-pink-light"
              }`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Q{i + 1} · Target: {r.target}</p>
                <p className="text-sm text-ink">
                  Child wrote: <span className="font-bold">{r.answer ?? "(nothing recognized)"}</span>
                </p>
              </div>
              <span className={`text-xl font-bold ${r.is_correct ? "text-brand-green" : "text-brand-pink"}`}>
                {r.is_correct ? "✓" : "✕"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" fullWidth onClick={() => navigate(`/progress`)}>
          View Progress
        </Button>
        <Button fullWidth onClick={() => navigate(`/practice/create/${session.child_id}`)}>
          Create More Practice
        </Button>
      </div>
    </div>
  );
}
