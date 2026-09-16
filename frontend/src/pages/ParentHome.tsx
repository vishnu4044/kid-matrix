import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { ChildCard } from "../features/children/ChildCard";
import { AddChildForm } from "../features/children/AddChildForm";
import { fetchChildren } from "../api/children";
import { useAuth } from "../features/auth/AuthContext";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ParentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddChild, setShowAddChild] = useState(false);

  const { data: children, isLoading, isError } = useQuery({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">
          {greeting()}, {user?.name?.split(" ")[0]}!
        </h1>
        <Button onClick={() => setShowAddChild(true)}>+ Add Child</Button>
      </div>
      <p className="mt-1 text-ink-soft">Here are your children</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {isLoading && <Card className="col-span-full p-6 text-ink-soft">Loading children...</Card>}
        {isError && (
          <Card className="col-span-full p-6 text-red-500">
            Couldn't load children. Check that the backend is running.
          </Card>
        )}
        {!isLoading && !isError && children?.length === 0 && (
          <Card className="col-span-full p-8 text-center text-ink-soft">
            No children yet. Tap <span className="font-bold text-brand-blue">+ Add Child</span> to get started.
          </Card>
        )}
        {children?.map((child, index) => (
          <ChildCard key={child.id} child={child} index={index} onClick={() => navigate(`/dashboard/${child.id}`)} />
        ))}
      </div>

      <Modal open={showAddChild} onClose={() => setShowAddChild(false)} title="Add a Child">
        <AddChildForm onDone={() => setShowAddChild(false)} />
      </Modal>
    </div>
  );
}
