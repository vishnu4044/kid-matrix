import { Card } from "../components/Card";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md p-10 text-center">
        <div className="text-5xl">🚧</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-ink-soft">This part of Kid Matrix is coming in {phase}.</p>
      </Card>
    </div>
  );
}
