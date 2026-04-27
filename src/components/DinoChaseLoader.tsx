/**
 * 8-bit Dino chasing a box loading animation.
 * Pure CSS/SVG pixel art — no external assets.
 * Auto-detects current page title from window.location.pathname.
 */
const ROUTE_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/$/, title: "Membuka Beranda" },
  { pattern: /^\/campaign\/[^/]+/, title: "Masuk ke Ruang Draw" },
  { pattern: /^\/inventory/, title: "Membuka Inventaris" },
  { pattern: /^\/history/, title: "Memuat Riwayat Draw" },
  { pattern: /^\/claims/, title: "Memuat Riwayat Klaim" },
  { pattern: /^\/topup/, title: "Membuka Top Up Koin" },
  { pattern: /^\/transactions\/[^/]+/, title: "Memuat Detail Transaksi" },
  { pattern: /^\/transactions/, title: "Memuat Riwayat Transaksi" },
  { pattern: /^\/redeem/, title: "Membuka Toko Penukaran" },
  { pattern: /^\/gift/, title: "Membuka Hadiah Koin" },
  { pattern: /^\/profile/, title: "Membuka Profil" },
  { pattern: /^\/trade\/new/, title: "Menyiapkan Trade Baru" },
  { pattern: /^\/trade\/req/, title: "Memuat Permintaan Trade" },
  { pattern: /^\/leaderboard/, title: "Memuat Papan Peringkat" },
  { pattern: /^\/about/, title: "Tentang Kami" },
  { pattern: /^\/contact/, title: "Hubungi Kami" },
  { pattern: /^\/terms/, title: "Memuat Syarat & Ketentuan" },
  { pattern: /^\/privacy/, title: "Memuat Kebijakan Privasi" },
  { pattern: /^\/login/, title: "Membuka Halaman Masuk" },
  { pattern: /^\/register/, title: "Membuka Pendaftaran" },
  { pattern: /^\/forgot-password/, title: "Memuat Lupa Kata Sandi" },
  { pattern: /^\/reset-password/, title: "Memuat Reset Kata Sandi" },
  { pattern: /^\/admin\/login/, title: "Masuk Panel Admin" },
  { pattern: /^\/admin\/users/, title: "Mengelola Pengguna" },
  { pattern: /^\/admin\/banned-users/, title: "Daftar Pengguna Diblokir" },
  { pattern: /^\/admin\/campaigns/, title: "Mengelola Campaign" },
  { pattern: /^\/admin\/probability/, title: "Pengaturan Probabilitas" },
  { pattern: /^\/admin\/categories/, title: "Mengelola Kategori" },
  { pattern: /^\/admin\/claims/, title: "Mengelola Klaim" },
  { pattern: /^\/admin\/messages/, title: "Memuat Pesan" },
  { pattern: /^\/admin\/pity/, title: "Pengaturan Pity" },
  { pattern: /^\/admin\/rewards/, title: "Mengelola Hadiah" },
  { pattern: /^\/admin\/coin-packages/, title: "Paket Koin" },
  { pattern: /^\/admin\/coupons/, title: "Mengelola Kupon" },
  { pattern: /^\/admin\/shipping/, title: "Pengaturan Pengiriman" },
  { pattern: /^\/admin\/gacha-logs/, title: "Memuat Log Gacha" },
  { pattern: /^\/admin\/stock-audit/, title: "Audit Stok" },
  { pattern: /^\/admin\/payment-settings/, title: "Pengaturan Pembayaran" },
  { pattern: /^\/admin\/maintenance/, title: "Mode Pemeliharaan" },
  { pattern: /^\/admin\/promo-banners/, title: "Banner Promo" },
  { pattern: /^\/admin\/gift-audit/, title: "Audit Hadiah" },
  { pattern: /^\/admin/, title: "Membuka Dasbor Admin" },
];

const resolvePageTitle = (): string => {
  if (typeof window === "undefined") return "Memuat halaman";
  const path = window.location.pathname;
  const match = ROUTE_TITLES.find((r) => r.pattern.test(path));
  return match?.title ?? "Memuat halaman";
};

const DinoChaseLoader = ({ label }: { label?: string }) => {
  const title = label ?? resolvePageTitle();
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes dino-bob {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
        }
        @keyframes dino-legs {
          0%, 100% { transform: scaleY(1) }
          50% { transform: scaleY(0.6) }
        }
        @keyframes box-wobble {
          0%, 100% { transform: translateX(0) rotate(-2deg) }
          50% { transform: translateX(4px) rotate(2deg) }
        }
        @keyframes ground-scroll {
          0% { background-position: 0 0 }
          100% { background-position: -16px 0 }
        }
        @keyframes chase-loop {
          0%   { transform: translateX(-90px) }
          50%  { transform: translateX(90px) }
          50.01% { transform: translateX(-90px) }
          100% { transform: translateX(-90px) }
        }
        @keyframes dust-puff {
          0% { opacity: 0.9; transform: translate(0,0) scale(1) }
          100% { opacity: 0; transform: translate(-12px, -2px) scale(0.4) }
        }
        @keyframes loading-dots {
          0%, 20% { opacity: 0.2 }
          50% { opacity: 1 }
          80%, 100% { opacity: 0.2 }
        }
        .dino-pixel { image-rendering: pixelated; image-rendering: crisp-edges; }
      `}</style>

      <div className="relative h-32 w-72 overflow-hidden">
        {/* Chase group: dino + box + dust move together */}
        <div
          className="absolute bottom-4 left-1/2 flex items-end gap-3"
          style={{
            animation: "chase-loop 2.8s linear infinite",
            transform: "translateX(-90px)",
          }}
        >
          {/* Dino 8-bit */}
          <div
            className="dino-pixel relative"
            style={{ animation: "dino-bob 0.4s steps(2) infinite" }}
          >
            <svg width="48" height="48" viewBox="0 0 16 16" shapeRendering="crispEdges">
              {/* Body */}
              <rect x="3" y="6" width="7" height="5" fill="hsl(var(--primary))" />
              {/* Head */}
              <rect x="8" y="3" width="5" height="5" fill="hsl(var(--primary))" />
              {/* Eye */}
              <rect x="11" y="4" width="1" height="1" fill="hsl(var(--background))" />
              {/* Mouth */}
              <rect x="12" y="6" width="1" height="1" fill="hsl(var(--background))" />
              {/* Tail */}
              <rect x="1" y="7" width="2" height="2" fill="hsl(var(--primary))" />
              {/* Back spikes */}
              <rect x="6" y="5" width="1" height="1" fill="hsl(var(--primary))" />
              <rect x="8" y="5" width="1" height="1" fill="hsl(var(--primary))" />
              {/* Legs (animated) */}
              <g style={{ animation: "dino-legs 0.2s steps(2) infinite", transformOrigin: "center bottom" }}>
                <rect x="4" y="11" width="2" height="2" fill="hsl(var(--primary))" />
                <rect x="7" y="11" width="2" height="2" fill="hsl(var(--primary))" />
              </g>
            </svg>
            {/* Dust puff */}
            <span
              className="absolute -left-2 bottom-0 block h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
              style={{ animation: "dust-puff 0.5s ease-out infinite" }}
            />
          </div>

          {/* Box */}
          <div
            className="dino-pixel"
            style={{ animation: "box-wobble 0.5s steps(2) infinite", transformOrigin: "center bottom" }}
          >
            <svg width="32" height="32" viewBox="0 0 16 16" shapeRendering="crispEdges">
              <rect x="2" y="3" width="12" height="11" fill="hsl(var(--accent))" />
              <rect x="2" y="3" width="12" height="2" fill="hsl(var(--accent) / 0.7)" />
              {/* Tape */}
              <rect x="7" y="3" width="2" height="11" fill="hsl(var(--accent-foreground) / 0.4)" />
              <rect x="2" y="8" width="12" height="1" fill="hsl(var(--accent-foreground) / 0.4)" />
              {/* Outline */}
              <rect x="2" y="3" width="12" height="1" fill="hsl(var(--foreground) / 0.6)" />
              <rect x="2" y="13" width="12" height="1" fill="hsl(var(--foreground) / 0.6)" />
              <rect x="2" y="3" width="1" height="11" fill="hsl(var(--foreground) / 0.6)" />
              <rect x="13" y="3" width="1" height="11" fill="hsl(var(--foreground) / 0.6)" />
            </svg>
          </div>
        </div>

        {/* Ground */}
        <div
          className="absolute bottom-3 left-0 right-0 h-1"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.6) 0 4px, transparent 4px 8px)",
            backgroundSize: "16px 100%",
            animation: "ground-scroll 0.3s linear infinite",
          }}
        />
        <div className="absolute bottom-2 left-0 right-0 h-px bg-border" />
      </div>

      <div className="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span style={{ animation: "loading-dots 1.2s infinite", animationDelay: "0s" }}>.</span>
        <span style={{ animation: "loading-dots 1.2s infinite", animationDelay: "0.2s" }}>.</span>
        <span style={{ animation: "loading-dots 1.2s infinite", animationDelay: "0.4s" }}>.</span>
      </div>
    </div>
  );
};

export default DinoChaseLoader;
