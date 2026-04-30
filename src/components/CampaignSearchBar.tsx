import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Sparkles, Package, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseImg } from "@/lib/imageTransform";
import { cn } from "@/lib/utils";

interface SearchResult {
  campaign_id: string;
  slug: string | null;
  title: string;
  image_url: string;
  price: number;
  matched_prize: string | null;
  match_type: "campaign" | "prize";
}

const QUICK_SUGGESTIONS = ["iPhone", "PlayStation 5", "Samsung", "Macbook", "Nintendo"];

const CampaignSearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Search
  useEffect(() => {
    let cancelled = false;
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .rpc("search_campaigns" as any, { _q: debounced, _lim: 8 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("search_campaigns error", error);
          setResults([]);
        } else {
          setResults((data as SearchResult[]) || []);
        }
        setLoading(false);
        setActiveIdx(-1);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goTo = (r: SearchResult) => {
    const target = r.slug || r.campaign_id;
    setOpen(false);
    setQuery("");
    navigate(`/campaign/${target}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIdx >= 0 ? activeIdx : 0;
      if (results[idx]) goTo(results[idx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && (debounced.length >= 2 || query.length === 0);
  const showSuggestions = useMemo(
    () => open && query.length === 0,
    [open, query]
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cari campaign atau hadiah (mis. iPhone, PS5, Samsung)…"
          aria-label="Cari campaign atau hadiah"
          className="h-12 w-full rounded-full border border-border/60 bg-card/80 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm backdrop-blur transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && !query.length && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-popover/95 shadow-2xl backdrop-blur animate-fade-in">
          {showSuggestions ? (
            <div className="p-3">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pencarian populer
              </p>
              <div className="flex flex-wrap gap-2 px-2 pb-1">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      setOpen(true);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                  >
                    <Sparkles className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mencari…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada campaign atau hadiah yang cocok untuk
              <span className="ml-1 font-semibold text-foreground">"{debounced}"</span>.
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={r.campaign_id}>
                  <button
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => goTo(r)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      activeIdx === i ? "bg-accent/10" : "hover:bg-secondary/60"
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border/40">
                      {r.image_url ? (
                        <img
                          src={supabaseImg(r.image_url, 96)}
                          alt={r.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                      {r.match_type === "prize" && r.matched_prize ? (
                        <p className="truncate text-xs text-accent">
                          <Sparkles className="mr-1 inline h-3 w-3" />
                          Hadiah: {r.matched_prize}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">Campaign</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                      {r.price} 🪙
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignSearchBar;
