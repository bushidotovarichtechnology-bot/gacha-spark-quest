import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

interface PrizeImage {
  url: string;
  name: string;
}

interface PrizeImagePreviewProps {
  image: (PrizeImage & { images?: PrizeImage[]; index?: number }) | null;
  onClose: () => void;
}

const PrizeImagePreview = ({ image, onClose }: PrizeImagePreviewProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = image?.images && image.images.length > 1 ? image.images : image ? [{ url: image.url, name: image.name }] : [];
  const hasSlides = slides.length > 1;

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex(image?.index ?? 0);
  }, [image?.url, image?.index]);

  const current = slides[currentIndex] || slides[0];

  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const goTo = (dir: 1 | -1) => {
    resetZoom();
    setCurrentIndex((i) => {
      const next = i + dir;
      if (next < 0) return slides.length - 1;
      if (next >= slides.length) return 0;
      return next;
    });
  };
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      overlayRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);


  const swipeStart = useRef<{ x: number; t: number } | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => clampScale(prev - e.deltaY * 0.002));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        dragStart.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
        setIsDragging(true);
      }
      swipeStart.current = { x: e.touches[0].clientX, t: Date.now() };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDistance.current !== null) {
        setScale((prev) => clampScale(prev * (dist / lastTouchDistance.current!)));
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isDragging && dragStart.current) {
      setPosition({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Swipe detection for slideshow
    if (scale <= 1 && hasSlides && swipeStart.current) {
      const endX = e.changedTouches[0]?.clientX ?? swipeStart.current.x;
      const dx = endX - swipeStart.current.x;
      const dt = Date.now() - swipeStart.current.t;
      if (dt < 400 && Math.abs(dx) > 50) {
        goTo(dx < 0 ? 1 : -1);
      }
    }
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    dragStart.current = null;
    swipeStart.current = null;
    setIsDragging(false);
    if (scale <= 1) setPosition({ x: 0, y: 0 });
  }, [scale, hasSlides, slides.length]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      setIsDragging(true);
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStart.current) {
      setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => { dragStart.current = null; setIsDragging(false); }, []);

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) resetZoom(); else setScale(2.5);
  }, [scale]);

  // Keyboard nav
  useEffect(() => {
    if (!image) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(-1);
      else if (e.key === "ArrowRight") goTo(1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [image, slides.length, currentIndex]);

  if (!current) return null;

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-lg"
          onClick={() => { if (scale <= 1) onClose(); }}
        >
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors">{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</button>
            <button onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s + 0.5)); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s - 0.5)); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); resetZoom(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">✕</button>
          </div>

          {/* Prev/Next arrows */}
          {hasSlides && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(-1); }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(1); }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image container */}
          <motion.div
            ref={containerRef}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative max-w-lg w-full mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl touch-none select-none"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleTap}
            style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
          >
            <div className="p-3">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current.url}
                  src={current.url}
                  alt={current.name}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.2 }}
                  className="w-full rounded-xl object-contain max-h-[60vh] pointer-events-none"
                  draggable={false}
                  style={{
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                  }}
                />
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Label + dots */}
          <div className="mt-3 text-center">
            <p className="font-display text-sm font-semibold text-foreground">{current.name}</p>
            {hasSlides && (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); resetZoom(); setCurrentIndex(i); }}
                    className={`h-2 rounded-full transition-all ${i === currentIndex ? "w-5 bg-accent" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60"}`}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {scale > 1 ? `${Math.round(scale * 100)}%` : hasSlides ? "Swipe atau klik panah untuk navigasi" : "Pinch atau double-tap untuk zoom"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrizeImagePreview;
