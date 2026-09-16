import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { ChildSwitcherBar } from "../features/children/ChildSwitcherBar";
import { useSelectedChild } from "../hooks/useSelectedChild";
import { fetchChildHistory } from "../api/children";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "letters", label: "Letters" },
  { key: "numbers", label: "Numbers" },
  { key: "shapes", label: "Shapes" },
  { key: "math", label: "Math" },
];

export function PracticeHistory() {
  const { children, selectedChild, selectedId, selectChild } = useSelectedChild();
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const { data: history, isLoading } = useQuery({
    queryKey: ["history", selectedId],
    queryFn: () => fetchChildHistory(selectedId!),
    enabled: Boolean(selectedId),
  });

  const filtered = (history ?? []).filter((s) => filter === "all" || s.type === filter);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Practice History</h1>
      <div className="mt-4">
        <ChildSwitcherBar children={children} selectedId={selectedId} onSelect={selectChild} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === f.key ? "bg-brand-blue text-white" : "bg-slate-100 text-ink-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-ink-soft">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center text-ink-soft">
            No completed practice sessions yet{selectedChild ? ` for ${selectedChild.name}` : ""}.
          </Card>
        )}
        {filtered.map((session) => (
          <Card
            key={session.id}
            onClick={() => navigate(`/practice/${session.id}/summary`)}
            className="flex cursor-pointer items-center justify-between p-5 transition hover:shadow-lg"
          >
            <div>
              <p className="font-semibold text-ink">{session.title}</p>
              <p className="text-sm text-ink-soft">
                {session.completed_at ? new Date(session.completed_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }) : ""}{" "}
                · {session.total_questions} questions
              </p>
            </div>
            <p className="font-display text-xl font-bold text-brand-green">{session.score ?? 0}%</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
