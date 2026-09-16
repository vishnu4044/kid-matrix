import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchChild, fetchChildProgress } from "../api/children";
import { Spinner } from "../components/Spinner";

const SUBJECTS = [
  { key: "letters", label: "Letters", color: "bg-brand-blue" },
  { key: "numbers", label: "Numbers", color: "bg-brand-green" },
  { key: "shapes", label: "Shapes", color: "bg-brand-yellow" },
  { key: "math", label: "Math", color: "bg-brand-pink" },
];

export function ChildDashboard() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  const { data: child, isLoading, isError } = useQuery({
    queryKey: ["child", childId],
    queryFn: () => fetchChild(Number(childId)),
    enabled: Boolean(childId),
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", childId],
    queryFn: () => fetchChildProgress(Number(childId)),
    enabled: Boolean(childId),
  });

  if (isLoading) return <Spinner label="Loading child..." />;
  if (isError || !child) return <p className="text-red-500">Couldn't load this child.</p>;

  const hasHistory = Boolean(progress && progress.sessions_completed > 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-light text-3xl">
            {child.avatar || "🙂"}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{child.name}</h1>
            <p className="text-ink-soft">
              {child.grade} · Age {child.age}
            </p>
          </div>
        </div>
        <button onClick={() => navigate("/home")} className="text-sm font-bold text-brand-blue">
          Switch Child
        </button>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold text-ink">Overall Progress</h2>
        {hasHistory ? (
          <div className="mt-3 flex items-center gap-6">
            <p className="font-display text-4xl font-extrabold text-brand-blue">{progress!.overall_accuracy}%</p>
            <div className="text-sm text-ink-soft">
              <p>{progress!.sessions_completed} sessions</p>
              <p>{progress!.questions_completed} questions</p>
              <p>{progress!.time_spent_minutes} minutes practiced</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-ink-soft">No practice sessions yet. Create a practice to get started.</p>
        )}
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="font-display text-lg font-bold text-ink">Subject Progress</h2>
        <div className="mt-4 space-y-3">
          {SUBJECTS.map((subject) => {
            const value = progress?.subject_progress?.[subject.key];
            return (
              <div key={subject.key}>
                <div className="mb-1 flex justify-between text-sm font-semibold text-ink-soft">
                  <span>{subject.label}</span>
                  <span>{value !== undefined ? `${value}%` : "—"}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${subject.color}`}
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Button onClick={() => navigate(`/practice/create/${childId}`)}>Create Practice</Button>
        <Button variant="secondary" onClick={() => navigate("/progress")}>
          View Progress
        </Button>
        <Button variant="secondary" onClick={() => navigate("/sessions")}>
          Practice History
        </Button>
        <Button variant="secondary" onClick={() => navigate("/ai-tutor")}>
          Ask AI Tutor
        </Button>
      </div>
    </div>
  );
}
