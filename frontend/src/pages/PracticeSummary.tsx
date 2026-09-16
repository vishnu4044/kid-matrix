import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchPractice } from "../api/practice";
import { fetchChild } from "../api/children";

export function PracticeSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ["practice", sessionId],
    queryFn: () => fetchPractice(Number(sessionId)),
    enabled: Boolean(sessionId),
  });
  const { data: child } = useQuery({
    queryKey: ["child", session?.child_id],
    queryFn: () => fetchChild(session!.child_id),
    enabled: Boolean(session),
  });

  if (isLoading || !session) return <p className="text-ink-soft">Loading...</p>;

  const correct = session.correct_count ?? Math.round(((session.score ?? 0) / 100) * session.total_questions);
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
        <h3 className="font-display text-lg font-bold text-ink">What They Practiced</h3>
        <p className="mt-2 capitalize text-ink-soft">{session.type}</p>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" fullWidth onClick={() => navigate(`/dashboard/${session.child_id}`)}>
          View Details
        </Button>
        <Button fullWidth onClick={() => navigate(`/practice/create/${session.child_id}`)}>
          Create More Practice
        </Button>
      </div>
    </div>
  );
}
