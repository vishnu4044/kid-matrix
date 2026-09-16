import { Card } from "../../components/Card";

export function ChildCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="animate-shimmer h-20 w-20 rounded-full" />
      <div className="animate-shimmer mt-4 h-6 w-24 rounded-lg" />
      <div className="animate-shimmer mt-2 h-4 w-20 rounded-lg" />
      <div className="animate-shimmer mt-2 h-4 w-14 rounded-lg" />
    </Card>
  );
}
