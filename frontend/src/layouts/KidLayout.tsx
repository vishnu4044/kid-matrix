import { Outlet, useNavigate } from "react-router-dom";

export function KidLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light via-white to-brand-yellow-light">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </div>
      <button
        onClick={() => navigate("/home")}
        className="fixed bottom-3 right-3 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-ink-soft shadow"
      >
        Exit Kid Mode
      </button>
    </div>
  );
}
