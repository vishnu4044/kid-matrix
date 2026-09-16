import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/progress", label: "Progress", icon: "📈" },
  { to: "/sessions", label: "Sessions", icon: "📚" },
  { to: "/ai-tutor", label: "AI Tutor", icon: "🤖" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function ParentLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-24">
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-100 bg-white py-2 md:inset-y-0 md:left-0 md:right-auto md:w-24 md:flex-col md:justify-start md:gap-2 md:border-r md:border-t-0 md:py-8">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold ${
                isActive ? "bg-brand-blue-light text-brand-blue" : "text-ink-soft"
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft md:mt-auto"
        >
          <span className="text-xl">🚪</span>
          Sign Out
        </button>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
