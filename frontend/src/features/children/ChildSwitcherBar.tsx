import type { Child } from "../../types";

export function ChildSwitcherBar({
  children,
  selectedId,
  onSelect,
}: {
  children: Child[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (children.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {children.map((child) => (
        <button
          key={child.id}
          onClick={() => onSelect(child.id)}
          className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-semibold ${
            selectedId === child.id
              ? "border-brand-blue bg-brand-blue-light text-brand-blue"
              : "border-slate-200 text-ink-soft"
          }`}
        >
          <span>{child.avatar || "🙂"}</span>
          {child.name}
        </button>
      ))}
    </div>
  );
}
