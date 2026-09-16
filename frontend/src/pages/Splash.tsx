import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-blue-light via-white to-brand-yellow-light px-6 text-center">
      <div className="flex gap-3 text-6xl">
        <span>🧒</span>
        <span>👧</span>
      </div>
      <h1 className="mt-6 font-display text-5xl font-extrabold">
        <span className="text-brand-blue">Kid</span> <span className="text-brand-pink">Matrix</span>
      </h1>
      <p className="mt-3 text-lg font-semibold text-ink-soft">Small Steps. Brighter Tomorrows.</p>

      <div className="mt-10 w-full max-w-xs space-y-3">
        <Link to="/register" className="block">
          <Button fullWidth>Get Started</Button>
        </Link>
        <p className="text-sm text-ink-soft">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-brand-blue">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
