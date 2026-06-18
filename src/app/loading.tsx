"use client";

import FlipFadeText from "@/components/ui/flip-fade-text";

export default function Loading() {
  const loadingWords = ["LOADING", "COMPUTING", "SEARCHING", "RETRIEVING", "ASSEMBLING"];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020206] text-zinc-100">
      {/* Background glowing ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Bat Logo Silhouette or watermark */}
      <div className="absolute opacity-[0.02] text-amber-500 pointer-events-none transform -translate-y-10 scale-150">
        <svg viewBox="0 0 170 40" className="w-80 h-auto fill-current">
          <path d="M 28 8 C 20 9, 14 12, 6 15 C 10 18, 11 21, 10 25 C 14 24, 18 25, 21 28 C 22 24, 25 22, 28 21 C 27 26, 27 29, 28 32 L 34 32 L 34 8 Z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Flip-Fade Text Component */}
        <FlipFadeText 
          words={loadingWords} 
          interval={2000} 
          className="min-h-[120px]"
          textClassName="text-3xl md:text-5xl font-mono tracking-widest text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]" 
        />
        
        {/* Secondary subtitle */}
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-550 uppercase animate-pulse">
          Secure Tunnel Connection
        </span>
      </div>
    </div>
  );
}
