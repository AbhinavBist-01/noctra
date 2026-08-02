"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion";

interface SpotlightGlowCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
}

export function SpotlightGlowCard({
  children,
  className = "",
  glowColor = "rgba(245, 158, 11, 0.18)",
  enableTilt = true,
  ...props
}: SpotlightGlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position relative to card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth tilt springs
  const rawRotateX = useTransform(mouseY, [-150, 150], [7, -7]);
  const rawRotateY = useTransform(mouseX, [-150, 150], [-7, 7]);

  const rotateX = useSpring(rawRotateX, { stiffness: 300, damping: 25 });
  const rotateY = useSpring(rawRotateY, { stiffness: 300, damping: 25 });

  // Spotlight position
  const spotlightX = useSpring(mouseX, { stiffness: 400, damping: 30 });
  const spotlightY = useSpring(mouseY, { stiffness: 400, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: enableTilt && isHovered ? rotateX : 0,
        rotateY: enableTilt && isHovered ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      transition={{ duration: 0.15 }}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#030309]/90 backdrop-blur-xl transition-colors duration-300 hover:border-amber-500/30 ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Radial Glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(350px circle at calc(50% + ${x}px) calc(50% + ${y}px), ${glowColor}, transparent 80%)`
          ),
        }}
      />

      {/* Radiant Border Line Highlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 0.6 : 0,
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(200px circle at calc(50% + ${x}px) calc(50% + ${y}px), rgba(245, 158, 11, 0.4), transparent 70%)`
          ),
        }}
      />

      {/* Card Content Container */}
      <div className="relative z-20 h-full w-full">{children}</div>
    </motion.div>
  );
}
