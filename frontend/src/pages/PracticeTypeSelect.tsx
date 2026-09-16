import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";

const TYPES = [
  { key: "letters", label: "Letters", icon: "🔤", color: "bg-brand-blue-light" },
  { key: "numbers", label: "Numbers", icon: "🔢", color: "bg-brand-green-light" },
  { key: "shapes", label: "Shapes", icon: "🔺", color: "bg-brand-yellow-light" },
  { key: "math", label: "Math", icon: "➕", color: "bg-brand-pink-light" },
  { key: "mixed", label: "Mixed Practice", icon: "🧩", color: "bg-brand-blue-light", sub: "Combine multiple skills" },
  { key: "ai", label: "AI Generate", icon: "🤖", color: "bg-brand-green-light", sub: "Describe what you want" },
];

export function PracticeTypeSelect() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Create Practice</h1>
      <p className="mt-1 text-ink-soft">What would you like to practice?</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {TYPES.map((t) => (
          <Card
            key={t.key}
            onClick={() => navigate(`/practice/create/${childId}/${t.key}`)}
            className="cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${t.color}`}>
              {t.icon}
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">{t.label}</h3>
            {t.sub && <p className="text-sm text-ink-soft">{t.sub}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
