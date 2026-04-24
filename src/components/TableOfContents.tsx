import { useState } from "react";
import { ChevronDown, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  title?: string;
}

const TableOfContents = ({ items, title = "Daftar Isi" }: TableOfContentsProps) => {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
    setOpen(false);
  };

  return (
    <nav
      aria-label={title}
      className="rounded-2xl border border-border/50 bg-card/60 p-4 md:p-5"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left md:cursor-default"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <ListOrdered className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        className={cn(
          "mt-3 space-y-1.5 text-sm md:block",
          open ? "block" : "hidden",
        )}
      >
        {items.map((item, idx) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className="flex gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <span className="font-mono text-xs text-primary/70">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
