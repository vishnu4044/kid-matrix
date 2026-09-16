import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { fetchChildren, deleteChild } from "../api/children";
import { clearPin, setPin, updateSettings } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../features/auth/AuthContext";

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const { data: children } = useQuery({ queryKey: ["children"], queryFn: fetchChildren });

  const nameMutation = useMutation({
    mutationFn: () => updateSettings({ name }),
    onSuccess: (updated) => {
      updateUser(updated);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    },
  });

  const audioMutation = useMutation({
    mutationFn: (audio_enabled: boolean) => updateSettings({ audio_enabled }),
    onSuccess: (updated) => updateUser(updated),
  });

  const setPinMutation = useMutation({
    mutationFn: () => setPin(pinInput),
    onSuccess: (updated) => {
      updateUser(updated);
      setPinInput("");
      setPinError(null);
    },
    onError: (err) => setPinError(getApiErrorMessage(err, "Couldn't set PIN")),
  });

  const clearPinMutation = useMutation({
    mutationFn: () => clearPin(),
    onSuccess: (updated) => updateUser(updated),
  });

  const removeChildMutation = useMutation({
    mutationFn: (id: number) => deleteChild(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["children"] }),
  });

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    nameMutation.mutate();
  };

  const handleSetPin = (e: FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    setPinMutation.mutate();
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold text-ink">Settings</h1>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Account Settings</h2>
        <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Email</label>
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-ink-soft"
            />
          </div>
          <Button type="submit" disabled={nameMutation.isPending || !name.trim()}>
            {nameSaved ? "Saved!" : nameMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Manage Children</h2>
        <div className="mt-4 space-y-2">
          {children?.map((child) => (
            <div key={child.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <span>{child.avatar || "🙂"}</span>
                {child.name}
              </span>
              <button
                onClick={() => removeChildMutation.mutate(child.id)}
                className="text-sm font-semibold text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
          {children?.length === 0 && <p className="text-sm text-ink-soft">No children yet.</p>}
        </div>
        <button onClick={() => navigate("/home")} className="mt-3 text-sm font-bold text-brand-blue">
          + Add a child from Home
        </button>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Parent PIN</h2>
        <p className="mt-1 text-sm text-ink-soft">
          A 4-digit PIN is required to exit Kid Mode back to your parent dashboard.
        </p>
        {user?.has_pin ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="font-semibold text-brand-green">PIN is set ✓</p>
            <button
              onClick={() => clearPinMutation.mutate()}
              className="text-sm font-semibold text-red-500"
              disabled={clearPinMutation.isPending}
            >
              Remove PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSetPin} className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-ink-soft">4-digit PIN</label>
              <input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="1234"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 tracking-widest focus:border-brand-blue focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={setPinMutation.isPending}>
              Set PIN
            </Button>
          </form>
        )}
        {pinError && <p className="mt-2 text-sm font-semibold text-red-500">{pinError}</p>}
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Audio & Display</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Spoken instructions</p>
            <p className="text-sm text-ink-soft">Read prompts aloud during practice ("Write the letter A").</p>
          </div>
          <button
            onClick={() => audioMutation.mutate(!user?.audio_enabled)}
            className={`h-8 w-14 rounded-full transition ${user?.audio_enabled ? "bg-brand-blue" : "bg-slate-200"}`}
            aria-label="Toggle spoken instructions"
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                user?.audio_enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Privacy & Data</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Kid Matrix stores only what's needed to run practice and track progress: your account,
          your children's profiles, their practice sessions and answers, and basic usage events.
          Handwriting images are stored locally on this server, not shared with third parties
          beyond the AI providers used to evaluate and generate practice content.
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-ink">Help & Support</h2>
        <p className="mt-2 text-sm text-ink-soft">
          This is an MVP build. For issues, check the project README for setup and API docs.
        </p>
      </Card>

      <button onClick={handleSignOut} className="w-full rounded-2xl bg-white p-4 text-center font-bold text-red-500 shadow">
        Sign Out
      </button>
    </div>
  );
}
