import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PrizeImagePreviewProps {
  image: { url: string; name: string } | null;
  onClose: () => void;
}

const PrizeImagePreview = ({ image, onClose }: PrizeImagePreviewProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset on new image
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [image?.url]);

  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => clampScale(prev - e.deltaY * 0.002));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
      setIsDragging(true);
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDistance.current !== null) {
        const delta = dist / lastTouchDistance.current;
        setScale((prev) => clampScale(prev * delta));
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isDragging && dragStart.current) {
      const newX = e.touches[0].clientX - dragStart.current.x;
      const newY = e.touches[0].clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    dragStart.current = null;
    setIsDragging(false);
    if (scale <= 1) setPosition({ x: 0, y: 0 });
  }, [scale]);

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

  const handleMouseUp = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  }, [scale]);

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
            <button
              onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s + 0.5)); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s - 0.5)); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              ✕
            </button>
          </div>

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
              <img
                src={image.url}
                alt={image.name}
                className="w-full rounded-xl object-contain max-h-[60vh] pointer-events-none"
                draggable={false}
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
              />
            </div>
          </motion.div>

          {/* Label + zoom hint */}
          <div className="mt-3 text-center">
            <p className="font-display text-sm font-semibold text-foreground">{image.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {scale > 1 ? `${Math.round(scale * 100)}%` : "Pinch atau double-tap untuk zoom"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrizeImagePreview;
