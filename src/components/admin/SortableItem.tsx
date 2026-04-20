import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** When true, render handle column inline; default true */
  showHandle?: boolean;
}

/**
 * Generic sortable wrapper using @dnd-kit. Renders a drag handle on the left
 * and the provided children to its right.
 */
export function SortableItem({ id, children, className, showHandle = true }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-stretch gap-1", className)}>
      {showHandle && (
        <button
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab touch-none items-center px-1 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
