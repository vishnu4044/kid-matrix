export function Spinner({ size = 40, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className="animate-spin-smooth rounded-full border-4 border-brand-blue-light border-t-brand-blue"
        style={{ width: size, height: size }}
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && <p className="text-sm font-semibold text-ink-soft">{label}</p>}
    </div>
  );
}
