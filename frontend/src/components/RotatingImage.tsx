import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const foodImages = [
  "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1478144592103-25e218a04891?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop",
]

type RotatingImageProps = {
  intervalMs?: number;
  className?: string;
  imgClassName?: string;
  preloadNext?: boolean;
  durations?: number[];
};

export default function RotatingImage({
  intervalMs = 7000,
  className = "",
  imgClassName = "",
  preloadNext = true,
  durations,
}: RotatingImageProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

    const safeImages = useMemo(() => foodImages.filter(Boolean), []);

    useEffect(() => {
      if (!preloadNext || safeImages.length < 2) return;
      const nextIdx = (index + 1) % safeImages.length;
      const img = new Image();
      img.src = safeImages[nextIdx];
    }, [index, preloadNext, safeImages]);

    useEffect(() => {
      if (safeImages.length < 2) return;
      const delay =
      Array.isArray(durations) && durations.length
      ? durations[index % durations.length]
      : intervalMs;
      timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % safeImages.length);
      }, delay) as unknown as number;

      return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }, [index, intervalMs, durations, safeImages.length]);

    const currentSrc = safeImages[index] ?? safeImages[0] ?? "";

    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSrc}
              src={currentSrc}
              alt=""
              aria-hidden
              draggable={false}
              className={`absolute inset-0 h-full w-full object-cover select-none touch-none ${imgClassName}`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.0, scale: 1.02 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
        </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/40 to-transparent" />
    </div>
  );
}
