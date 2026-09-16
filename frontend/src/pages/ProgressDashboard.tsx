import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { ChildSwitcherBar } from "../features/children/ChildSwitcherBar";
import { useSelectedChild } from "../hooks/useSelectedChild";
import { fetchChildHistory, fetchChildProgress } from "../api/children";
import { Spinner } from "../components/Spinner";

const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  letters: { label: "Letters", color: "bg-brand-blue" },
  numbers: { label: "Numbers", color: "bg-brand-green" },
  shapes: { label: "Shapes", color: "bg-brand-yellow" },
  math: { label: "Math", color: "bg-brand-pink" },
};

const STATUS_STYLES: Record<string, string> = {
  mastered: "bg-brand-green text-white",
  improving: "bg-brand-yellow text-ink",
  needs_practice: "bg-brand-pink text-white",
  not_started: "bg-slate-100 text-ink-soft",
};

const STATUS_ICON: Record<string, string> = {
  mastered: "✓",
  improving: "⚠",
  needs_practice: "✕",
  not_started: "–",
};

const PERIODS = [
  { key: 7, label: "7 Days" },
  { key: 30, label: "30 Days" },
  { key: 90, label: "3 Months" },
];

export function ProgressDashboard() {
  const { children, selectedChild, selectedId, selectChild } = useSelectedChild();
  const [period, setPeriod] = useState(7);

  const { data: progress } = useQuery({
    queryKey: ["progress", selectedId],
    queryFn: () => fetchChildProgress(selectedId!),
    enabled: Boolean(selectedId),
  });

  const { data: history } = useQuery({
    queryKey: ["history", selectedId],
    queryFn: () => fetchChildHistory(selectedId!),
    enabled: Boolean(selectedId),
  });

  const cutoff = Date.now() - period * 24 * 60 * 60 * 1000;
  const trendSessions = (history ?? [])
    .filter((s) => s.completed_at && new Date(s.completed_at).getTime() >= cutoff)
    .slice()
    .reverse();

  const letterTopics = progress?.topics?.letters ?? [];
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Progress</h1>
      <div className="mt-4">
        <ChildSwitcherBar children={children} selectedId={selectedId} onSelect={selectChild} />
      </div>

      {!selectedChild || !progress ? (
        <Spinner label="Loading progress..." />
      ) : (
        <>
          <Card className="mt-6 p-6 text-center">
            <p className="font-semibold text-ink-soft">Overall Progress</p>
            <p className="mt-2 font-display text-5xl font-extrabold text-brand-blue">
              {progress.overall_accuracy}%
            </p>
            <div className="mt-4 flex justify-center gap-8 text-sm text-ink-soft">
              <div>
                <p className="text-lg font-bold text-ink">{progress.sessions_completed}</p>
                Sessions
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{progress.questions_completed}</p>
                Questions
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{progress.time_spent_minutes}m</p>
                Time Spent
              </div>
            </div>
          </Card>

          <Card className="mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Subject Progress</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(SUBJECT_LABELS).map(([key, meta]) => {
                const value = progress.subject_progress[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-sm font-semibold text-ink-soft">
                      <span>{meta.label}</span>
                      <span>{value !== undefined ? `${value}%` : "—"}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${meta.color}`}
                        style={{ width: `${value ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="mt-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Trend</h2>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      period === p.key ? "bg-brand-blue text-white" : "bg-slate-100 text-ink-soft"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {trendSessions.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">No completed sessions in this period yet.</p>
            ) : (
              <TrendChart sessions={trendSessions} />
            )}
          </Card>

          <Card className="mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Letters Progress</h2>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-9">
              {allLetters.map((letter) => {
                const entry = letterTopics.find((t) => t.topic === letter);
                const status = entry?.status ?? "not_started";
                return (
                  <div
                    key={letter}
                    title={entry ? `${entry.accuracy}% (${entry.attempts} attempts)` : "Not practiced yet"}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold ${STATUS_STYLES[status]}`}
                  >
                    <span>{letter}</span>
                    <span className="text-xs">{STATUS_ICON[status]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-soft">
              <span>✓ Mastered</span>
              <span>⚠ Improving</span>
              <span>✕ Needs Practice</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function TrendChart({ sessions }: { sessions: { completed_at: string | null; score: number | null }[] }) {
  const width = 600;
  const height = 160;
  const padding = 20;
  const points = sessions.map((s, i) => {
    const x = padding + (i / Math.max(1, sessions.length - 1)) * (width - padding * 2);
    const y = height - padding - ((s.score ?? 0) / 100) * (height - padding * 2);
    return { x, y, score: s.score ?? 0 };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label="Accuracy trend">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />
      <path d={path} fill="none" stroke="#5aa9ff" strokeWidth={3} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#5aa9ff" />
      ))}
    </svg>
  );
}
