import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export interface BiteshipArea {
  id: string;
  name: string;
  country_name: string;
  administrative_division_level_1_name: string; // province
  administrative_division_level_2_name: string; // city/regency
  administrative_division_level_3_name: string; // district
  administrative_division_level_4_name?: string; // sub-district
  postal_code: string | number;
}

interface Props {
  value: BiteshipArea | null;
  onChange: (a: BiteshipArea | null) => void;
}

const BiteshipAreaPicker = ({ value, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BiteshipArea[]>([]);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biteship-areas?input=${encodeURIComponent(query.trim())}&type=single`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const data = await res.json();
        setResults(data.areas || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const select = (a: BiteshipArea) => {
    onChange(a);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4" /> Area Tujuan (Kelurahan/Kecamatan)
      </Label>

      {value && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-sm">
          <p className="font-semibold text-foreground">{value.administrative_division_level_3_name}</p>
          <p className="text-xs text-muted-foreground">
            {value.administrative_division_level_2_name}, {value.administrative_division_level_1_name} {value.postal_code}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1.5 text-xs font-medium text-primary hover:underline"
          >
            Ganti area
          </button>
        </div>
      )}

      {!value && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Ketik kelurahan/kecamatan, mis: Cilandak"
              className="pl-9"
            />
            {loading && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {open && query.trim().length >= 3 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
              {results.length === 0 && !loading && (
                <p className="px-3 py-3 text-xs text-muted-foreground">Tidak ada area ditemukan</p>
              )}
              {results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select(a)}
                  className="block w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                >
                  <p className="text-sm font-medium text-foreground">
                    {a.administrative_division_level_3_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.administrative_division_level_2_name}, {a.administrative_division_level_1_name} · {a.postal_code}
                  </p>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Minimal 3 karakter untuk mencari area.</p>
        </div>
      )}
    </div>
  );
};

export default BiteshipAreaPicker;
