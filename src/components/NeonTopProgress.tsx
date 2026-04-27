import { useEffect, useState } from "react";

/**
 * Top neon progress bar shown during route transitions.
 * Driven by a global `isLoading` flag — it animates indeterminately while
 * loading, then snaps to 100% and fades out when done.
 */
const NeonTopProgress = ({ isLoading }: { isLoading: boolean }) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let trickle: ReturnType<typeof setInterval> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (isLoading) {
      setVisible(true);
      setProgress(8);
      // Simulated progress — never reaches 100 until loading actually ends.
      trickle = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          const step = p < 30 ? 8 : p < 60 ? 4 : 2;
          return Math.min(90, p + step);
        });
      }, 220);
    } else {
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 320);
    }

    return () => {
      if (trickle) clearInterval(trickle);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] shadow-[0_0_8px_hsl(var(--primary)/0.8),0_0_16px_hsl(var(--accent)/0.6)] transition-[width] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          animation: "neon-shimmer 1.4s linear infinite",
        }}
      />
      <style>{`
        @keyframes neon-shimmer {
          0% { background-position: 0% 50% }
          100% { background-position: 200% 50% }
        }
      `}</style>
    </div>
  );
};

export default NeonTopProgress;
