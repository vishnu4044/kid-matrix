import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChildren } from "../api/children";

const STORAGE_KEY = "kid_matrix_selected_child";

export function useSelectedChild() {
  const { data: children } = useQuery({ queryKey: ["children"], queryFn: fetchChildren });
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    if (!selectedId && children && children.length > 0) {
      setSelectedId(children[0].id);
    }
  }, [children, selectedId]);

  const selectChild = (id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setSelectedId(id);
  };

  const selectedChild = children?.find((c) => c.id === selectedId) ?? null;

  return { children: children ?? [], selectedChild, selectedId, selectChild };
}
