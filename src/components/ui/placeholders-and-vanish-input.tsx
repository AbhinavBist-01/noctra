"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  disabled,
  value,
  onValueChange,
}: {
  placeholders: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value !== undefined ? value : internalValue;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation();
    }
  };

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholders]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<{ x: number; y: number; r: number; color: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [animating, setAnimating] = useState(false);

  const draw = useCallback(() => {
    if (!inputRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);
    const computedStyles = getComputedStyle(inputRef.current);

    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"));
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = "#FFF";
    ctx.fillText(inputValue, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const newData: { x: number; y: number; color: number[] }[] = [];

    for (let t = 0; t < 800; t++) {
      const i = 4 * t * 800;
      for (let n = 0; n < 800; n++) {
        const e = i + 4 * n;
        const r = pixelData[e] ?? 0;
        const g = pixelData[e + 1] ?? 0;
        const b = pixelData[e + 2] ?? 0;
        const a = pixelData[e + 3] ?? 0;
        if (r !== 0 && g !== 0 && b !== 0) {
          newData.push({
            x: n,
            y: t,
            color: [r, g, b, a],
          });
        }
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0] ?? 0}, ${color[1] ?? 0}, ${color[2] ?? 0}, ${color[3] ?? 0})`,
    }));
  }, [inputValue]);

  useEffect(() => {
    draw();
  }, [draw]);

  const animate = (start: number) => {
    const animateFrame = (pos = 0) => {
      requestAnimationFrame(() => {
        const newArr: { x: number; y: number; r: number; color: string }[] = [];
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i];
          if (!current) continue;
          if (current.x < pos) {
            newArr.push(current);
          } else {
            if (current.r <= 0) {
              current.r = 0;
              continue;
            }
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            newArr.push(current);
          }
        }
        newDataRef.current = newArr;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800);
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color } = t;
            if (n > pos) {
              ctx.beginPath();
              ctx.rect(n, i, s, s);
              ctx.fillStyle = color;
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          });
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setAnimating(false);
        }
      });
    };
    animateFrame(start);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !animating && inputValue.trim()) {
      vanishAndSubmit();
    }
  };

  const vanishAndSubmit = () => {
    setAnimating(true);
    draw();

    const inputEl = inputRef.current;
    if (inputEl) {
      const maxX = newDataRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0,
      );
      animate(maxX);
    }

    const val = inputValue;
    if (value === undefined) setInternalValue("");
    if (onValueChange) onValueChange("");
    onSubmit(val);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!animating) {
      if (value === undefined) setInternalValue(e.target.value);
      if (onValueChange) onValueChange(e.target.value);
      if (onChange) onChange(e);
    }
  };

  return (
    <div
      className={cn(
        "relative mx-auto h-12 w-full overflow-hidden rounded-2xl bg-white/[0.025] border border-white/[0.06] transition duration-200",
        inputValue && "bg-white/[0.04]",
      )}
    >
      <canvas
        className={cn(
          "pointer-events-none absolute left-2 top-[20%] origin-top-left scale-50 transform pr-20 text-base invert dark:invert-0",
          !animating ? "opacity-0" : "opacity-100",
        )}
        ref={canvasRef}
      />
      <input
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        value={inputValue}
        type="text"
        disabled={disabled || animating}
        className={cn(
          "relative z-50 h-full w-full rounded-2xl border-none bg-transparent pl-4 pr-12 text-sm font-mono text-zinc-200 focus:outline-none focus:ring-0 disabled:opacity-60",
          animating && "text-transparent",
        )}
      />

      <button
        disabled={!inputValue.trim() || disabled}
        onClick={vanishAndSubmit}
        className="absolute right-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-500 transition-colors hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <motion.path
            d="M5 12l14 0"
            initial={{ strokeDasharray: "50%", strokeDashoffset: "50%" }}
            animate={{ strokeDashoffset: inputValue ? 0 : "50%" }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
          <path d="M13 18l6 -6" />
          <path d="M13 6l6 6" />
        </motion.svg>
      </button>

      {/* Animated placeholder */}
      <div className="pointer-events-none absolute inset-0 flex items-center pl-4">
        <AnimatePresence mode="wait">
          {!inputValue && (
            <motion.p
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              key={currentPlaceholder}
              className="w-[calc(100%-3rem)] truncate text-sm font-mono text-zinc-600"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
