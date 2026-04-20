import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

/**
 * Returns sensors and a helper that, given the current list and a drag end event,
 * produces the new ordered list. Persisting is the caller's responsibility.
 */
export function useSortableList() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorder = <T extends { id: string }>(items: T[], event: DragEndEvent): T[] | null => {
    const { active, over } = event;
    if (!over || active.id === over.id) return null;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return null;
    return arrayMove(items, oldIndex, newIndex);
  };

  return useMemo(
    () => ({
      sensors,
      collisionDetection: closestCenter,
      reorder,
    }),
    [sensors]
  );
}
