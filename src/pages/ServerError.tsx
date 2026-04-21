import { Link } from "react-router-dom";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import faintedDino from "@/assets/fainted-dino-500.png";

interface ServerErrorProps {
  error?: Error | null;
  onReset?: () => void;
}

const ServerError = ({ error, onReset }: ServerErrorProps) => {
  const handleRetry = () => {
    if (onReset) onReset();
    else window.location.reload();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero px-4 py-12">
      {/* Floating sparkles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-destructive/60 animate-sparkle-twinkle"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center">
        {/* Fainted Dino with subtle bounce */}
        <div className="relative mx-auto mb-6 w-64 sm:w-80 animate-bounce-slow">
          <div className="absolute inset-0 rounded-full bg-destructive/20 blur-3xl" aria-hidden="true" />
          <img
            src={faintedDino}
            alt="Fainted dinosaur mascot with broken gears"
            width={768}
            height={768}
            loading="eager"
            className="relative w-full h-auto drop-shadow-[0_0_30px_hsl(var(--neon-purple)/0.5)]"
          />
        </div>

        {/* 500 Text */}
        <h1 className="font-display text-7xl sm:text-8xl font-bold text-glow-purple text-primary mb-2 tracking-wider animate-fade-in">
          500
        </h1>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-accent text-glow-gold mb-4 animate-fade-in">
          Dino-nya Pingsan!
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground mb-2 animate-fade-in">
          Ada masalah di server kami. Tim teknis sudah dikerahkan.
        </p>
        <p className="text-sm text-muted-foreground/80 mb-8 animate-fade-in">
          Coba muat ulang halaman dalam beberapa saat.
        </p>

        {/* Error detail (dev only) */}
        {error?.message && (
          <div className="mb-8 inline-flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 backdrop-blur px-4 py-2 text-xs sm:text-sm text-destructive max-w-full animate-fade-in">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <code className="font-mono break-all text-left">{error.message}</code>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
          <Button
            variant="neon"
            size="lg"
            onClick={handleRetry}
            className="font-display tracking-wider"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>

        {/* Helpful links */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/contact" className="text-primary hover:text-accent transition-colors story-link">
            Hubungi Support
          </Link>
          <Link to="/about" className="text-primary hover:text-accent transition-colors story-link">
            Tentang Kami
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
