import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchPracticeResults } from "../api/practice";
import { fetchChild } from "../api/children";

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

  if (isLoading || !session) return <p className="text-ink-soft">Loading...</p>;

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
        <div className="mt-4 grid grid-cols-5 gap-2">
          {results.map((r) => (
            <div
              key={r.question_id}
              title={r.feedback ?? undefined}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold ${
                r.is_correct ? "bg-brand-green text-white" : "bg-brand-pink text-white"
              }`}
            >
              <span className="text-base">{r.target}</span>
              <span>{r.is_correct ? "✓" : "✕"}</span>
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
