import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { createChild } from "../../api/children";
import { getApiErrorMessage } from "../../api/client";

const GOAL_OPTIONS = ["Letters", "Numbers", "Shapes", "Basic Math"];
const AVATAR_OPTIONS = ["🦄", "🚀", "🐼", "🦊", "🐸", "🌟"];

export function AddChildForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [age, setAge] = useState(5);
  const [grade, setGrade] = useState("Kindergarten");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [goals, setGoals] = useState<string[]>(["Letters"]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createChild({ name, age, grade, avatar, learning_goals: goals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      onDone();
    },
    onError: (err) => setError(getApiErrorMessage(err, "Could not add child")),
  });

  const toggleGoal = (goal: string) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Child's Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
          placeholder="Emma"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">Age</label>
          <input
            type="number"
            min={1}
            max={18}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
          >
            <option>Pre-K</option>
            <option>Kindergarten</option>
            <option>Grade 1</option>
            <option>Grade 2</option>
            <option>Grade 3</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Avatar</label>
        <div className="flex gap-2">
          {AVATAR_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setAvatar(option)}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl border-2 ${
                avatar === option ? "border-brand-blue bg-brand-blue-light" : "border-transparent bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ink-soft">Learning goals</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              type="button"
              key={goal}
              onClick={() => toggleGoal(goal)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                goals.includes(goal) ? "bg-brand-green text-white" : "bg-slate-100 text-ink-soft"
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      <Button type="submit" fullWidth disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save Child"}
      </Button>
    </form>
  );
}
