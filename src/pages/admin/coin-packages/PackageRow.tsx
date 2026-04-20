import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoinPackage, formatRupiah, getIcon, isPromoActive } from "./types";

interface Props {
  pkg: CoinPackage;
  index: number;
  onEdit: (pkg: CoinPackage) => void;
  onDelete: (id: string) => void;
}

export const PackageRow = ({ pkg, index, onEdit, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const Icon = getIcon(pkg.icon);
  const promoActive = isPromoActive(pkg);

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border/50 last:border-0 bg-card">
      <td className="px-2 py-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      <td className="px-3 py-3 font-mono text-muted-foreground w-12">{index + 1}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {pkg.name}
        </div>
      </td>
      <td className="px-3 py-3">{pkg.coins.toLocaleString()}</td>
      <td className="px-3 py-3">
        {promoActive ? (
          <div>
            <span className="text-muted-foreground line-through text-xs">{formatRupiah(pkg.price)}</span>
            <br />
            <span className="text-primary font-medium">
              {formatRupiah(Math.round(pkg.price * (1 - pkg.discount_percent / 100)))}
            </span>
          </div>
        ) : formatRupiah(pkg.price)}
      </td>
      <td className="px-3 py-3">
        {pkg.discount_percent > 0 ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", promoActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
            {pkg.discount_percent}% {promoActive ? "🔥" : "(expired)"}
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-3">
        {pkg.bonus_coins > 0 ? (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
            +{pkg.bonus_coins} {pkg.bonus_label && `(${pkg.bonus_label})`}
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          {pkg.is_popular && <span className="text-xs">⭐</span>}
          {pkg.is_active ? <span className="text-xs text-primary">Aktif</span> : <span className="text-xs text-muted-foreground">Nonaktif</span>}
        </div>
      </td>
      <td className="px-3 py-3 text-right space-x-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(pkg)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(pkg.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
};
