import { Link } from "react-router-dom";
import { Home, Wrench, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import sleepingDino from "@/assets/sleeping-dino-maintenance.png";

interface MaintenanceProps {
  estimatedTime?: string;
  message?: string;
}

const Maintenance = ({ estimatedTime, message }: MaintenanceProps) => {
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
        {/* Sleeping Dino with gentle bounce */}
        <div className="relative mx-auto mb-6 w-64 sm:w-80 animate-bounce-slow">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
          <img
            src={sleepingDino}
            alt="Sleeping dinosaur mascot with nightcap"
            width={768}
            height={768}
            loading="eager"
            className="relative w-full h-auto drop-shadow-[0_0_30px_hsl(var(--neon-purple)/0.5)]"
          />
        </div>

        {/* Maintenance badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 backdrop-blur px-4 py-1.5 text-xs sm:text-sm text-accent animate-fade-in">
          <Wrench className="h-3.5 w-3.5" />
          <span className="font-display tracking-wider uppercase">Maintenance Mode</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-bold text-glow-purple text-primary mb-3 tracking-wider animate-fade-in">
          Dino-nya Tidur Dulu
        </h1>

        <h2 className="font-display text-xl sm:text-2xl font-bold text-accent text-glow-gold mb-4 animate-fade-in">
          Sedang Update Sistem
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground mb-2 animate-fade-in">
          {message ?? "Kami sedang melakukan perbaikan biar pengalaman gacha kamu makin mantap."}
        </p>
        <p className="text-sm text-muted-foreground/80 mb-8 animate-fade-in">
          Silakan kembali lagi sebentar lagi, ya!
        </p>

        {/* Estimated time */}
        {estimatedTime && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 backdrop-blur px-4 py-2 text-xs sm:text-sm text-muted-foreground animate-fade-in">
            <Clock className="h-4 w-4 text-primary" />
            <span>Perkiraan selesai: <span className="text-foreground font-medium">{estimatedTime}</span></span>
          </div>
        )}

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

export default Maintenance;
