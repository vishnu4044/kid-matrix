import { Card } from "../../components/Card";
import type { Child } from "../../types";

const ACCENTS = ["bg-brand-blue-light", "bg-brand-green-light", "bg-brand-yellow-light", "bg-brand-pink-light"];

export function ChildCard({ child, onClick, index = 0 }: { child: Child; onClick?: () => void; index?: number }) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${onClick ? "" : ""}`}
    >
      <div className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${accent}`}>
        {child.avatar || "🙂"}
      </div>
      <h3 className="mt-4 font-display text-2xl font-bold text-ink">{child.name}</h3>
      <p className="text-ink-soft">{child.grade}</p>
      <p className="text-ink-soft">Age {child.age}</p>
    </Card>
  );
}
