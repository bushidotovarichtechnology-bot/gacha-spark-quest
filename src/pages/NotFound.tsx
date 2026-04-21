import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import sadDino from "@/assets/sad-dino-404.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero px-4 py-12">
      {/* Floating sparkles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-accent/60 animate-sparkle-twinkle"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center">
        {/* Sad Dino with floating animation */}
        <div className="relative mx-auto mb-6 w-64 sm:w-80 animate-bounce-slow">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
          <img
            src={sadDino}
            alt="Sad dinosaur mascot holding an empty box"
            width={768}
            height={768}
            loading="eager"
            className="relative w-full h-auto drop-shadow-[0_0_30px_hsl(var(--neon-purple)/0.5)]"
          />
        </div>

        {/* 404 Text */}
        <h1 className="font-display text-7xl sm:text-8xl font-bold text-glow-purple text-primary mb-2 tracking-wider animate-fade-in">
          404
        </h1>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-accent text-glow-gold mb-4 animate-fade-in">
          Kotaknya Kosong!
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground mb-2 animate-fade-in">
          Yah... halaman yang kamu cari tidak ditemukan.
        </p>
        <p className="text-sm text-muted-foreground/80 mb-8 animate-fade-in">
          Mungkin sudah pindah, dihapus, atau hanya mitos belaka.
        </p>

        {/* Path display */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 backdrop-blur px-4 py-2 text-xs sm:text-sm text-muted-foreground animate-fade-in">
          <Search className="h-4 w-4 text-primary" />
          <code className="font-mono break-all">{location.pathname}</code>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
          <Button
            variant="neon"
            size="lg"
            asChild
            className="font-display tracking-wider"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Halaman Sebelumnya
          </Button>
        </div>

        {/* Helpful links */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/leaderboard" className="text-primary hover:text-accent transition-colors story-link">
            Leaderboard
          </Link>
          <Link to="/redeem" className="text-primary hover:text-accent transition-colors story-link">
            Redeem Store
          </Link>
          <Link to="/about" className="text-primary hover:text-accent transition-colors story-link">
            Tentang Kami
          </Link>
          <Link to="/contact" className="text-primary hover:text-accent transition-colors story-link">
            Kontak
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
