import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchPractice, startPractice } from "../api/practice";
import { fetchChild } from "../api/children";
import { Spinner } from "../components/Spinner";

export function PracticeReady() {
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

  const mutation = useMutation({
    mutationFn: () => startPractice(Number(sessionId)),
    onSuccess: () => navigate(`/kid/${session?.child_id}/practice/${sessionId}`),
  });

  if (isLoading || !session) return <Spinner label="Getting practice ready..." />;

  const estimatedMinutes = Math.max(1, Math.round((session.total_questions * 30) / 60));

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-md p-10 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">All Set!</h1>
        <p className="mt-1 text-ink-soft">
          {child ? `${child.name}'s` : "The"} practice is ready.
        </p>

        <div className="mt-6 space-y-2 text-left">
          <p className="flex items-center gap-2 text-ink">
            <span>✅</span> {session.total_questions} Questions
          </p>
          <p className="flex items-center gap-2 text-ink">
            <span>✅</span> {session.title}
          </p>
          <p className="flex items-center gap-2 text-ink">
            <span>✅</span> Estimated time: {estimatedMinutes} minute{estimatedMinutes > 1 ? "s" : ""}
          </p>
        </div>

        <p className="mt-6 text-sm font-semibold text-ink-soft">
          Hand the iPad to {child?.name ?? "your child"}.
        </p>

        <Button className="mt-4" fullWidth onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Starting..." : `Start for ${child?.name ?? "Child"}`}
        </Button>
      </Card>
    </div>
  );
}
