"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChatCircle,
  Brain,
  Database,
  TerminalWindow,
  Code,
  FileText,
  SlackLogo,
  NotionLogo,
  Check,
  CircleNotch,
  Clock,
  Minus,
  Globe,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────
   Niche: AI Agent Workspace
   Grid: 3 cards top row · 2 cards bottom row
   Each FeatCard takes: title, description, children (visual)
   ────────────────────────────────────────────────────── */

interface FeatCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  /** Optional extra classes for sizing/spanning */
  className?: string;
}

export function FeatCard({ title, description, children, className = "" }: FeatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-[20px] p-5",
        "bg-zinc-950/40 border border-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/80",
        "hover:border-amber-500/20 hover:shadow-amber-500/[0.02] transition-all duration-300",
        className
      )}
    >
      <div className="z-10 flex flex-col gap-1">
        <h3 className="font-semibold text-zinc-150 text-sm tracking-tight">{title}</h3>
        <p className="text-zinc-400 text-[11px] leading-relaxed max-w-[95%]">{description}</p>
      </div>
      <div className="relative mt-2 flex-1 w-full rounded-[14px] overflow-hidden border border-white/[0.03] bg-zinc-950/30">
        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Card1 – Agent Pipeline
   Minimalist precise node graph with real-time task flows
   ───────────────────────────────────────────── */

type ActiveStep = 'request' | 'router' | 'agent' | 'memory' | 'tools' | 'response';

const VW = 320;
const VH = 240;

interface NodeConfig {
  id: string;
  x: number;
  y: number;
  icon?: any;
  label?: string;
  type: 'box' | 'circle';
}

const NODES: NodeConfig[] = [
  { id: 'A', x: 50, y: 120, icon: ChatCircle, label: "REQUEST", type: 'box' },
  { id: 'Router', x: 125, y: 120, type: 'circle' },
  { id: 'C', x: 200, y: 120, icon: Brain, label: "AGENT", type: 'box' },
  { id: 'B', x: 280, y: 50, icon: Database, label: "MEMORY", type: 'box' },
  { id: 'D', x: 280, y: 190, icon: TerminalWindow, label: "TOOLS", type: 'box' },
];

interface FlowPath {
  id: string;
  d: string;
  activeSteps: ActiveStep[];
  flowDirection: 'forward' | 'backward' | 'both';
  colorClass: string;
}

const PATHS: FlowPath[] = [
  {
    id: "a-to-router",
    d: "M 78 120 L 113 120",
    activeSteps: ["request"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
  {
    id: "router-to-agent",
    d: "M 137 120 L 172 120",
    activeSteps: ["agent"],
    flowDirection: "forward",
    colorClass: "text-violet-500 dark:text-violet-400",
  },
  {
    id: "agent-to-memory",
    d: "M 200 92 L 200 50 L 252 50",
    activeSteps: ["memory"],
    flowDirection: "both",
    colorClass: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    id: "agent-to-tools",
    d: "M 200 148 L 200 190 L 252 190",
    activeSteps: ["tools"],
    flowDirection: "both",
    colorClass: "text-emerald-500 dark:text-emerald-400",
  },
  {
    id: "response-flow-1",
    d: "M 172 120 L 137 120",
    activeSteps: ["response"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
  {
    id: "response-flow-2",
    d: "M 113 120 L 78 120",
    activeSteps: ["response"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
];

const NODE_COLORS = {
  A: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/60 dark:border-cyan-400/50",
    text: "text-cyan-400",
    buttonBg: "bg-cyan-500",
    buttonBorder: "border-cyan-600",
  },
  Router: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/60 dark:border-amber-400/50",
    text: "text-amber-400",
    buttonBg: "bg-amber-500",
    buttonBorder: "border-amber-600",
  },
  C: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/60 dark:border-violet-400/50",
    text: "text-violet-400",
    buttonBg: "bg-violet-500",
    buttonBorder: "border-violet-600",
  },
  B: {
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/60 dark:border-fuchsia-400/50",
    text: "text-fuchsia-400",
    buttonBg: "bg-fuchsia-500",
    buttonBorder: "border-fuchsia-600",
  },
  D: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/60 dark:border-emerald-400/50",
    text: "text-emerald-400",
    buttonBg: "bg-emerald-500",
    buttonBorder: "border-emerald-600",
  },
};

export function Card1() {
  const [step, setStep] = useState<ActiveStep>("request");

  useEffect(() => {
    const steps: ActiveStep[] = ["request", "router", "agent", "memory", "tools", "response"];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setStep(steps[idx] ?? "request");
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const isNodeActive = (nodeId: string) => {
    switch (step) {
      case 'request':
        return nodeId === 'A';
      case 'router':
        return nodeId === 'Router';
      case 'agent':
        return nodeId === 'C';
      case 'memory':
        return nodeId === 'C' || nodeId === 'B';
      case 'tools':
        return nodeId === 'C' || nodeId === 'D';
      case 'response':
        return nodeId === 'C' || nodeId === 'Router' || nodeId === 'A';
      default:
        return false;
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-zinc-950/20 rounded-xl flex items-center justify-center p-2">
      {/* ── Layer 1: Clean dotted grid ── */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <pattern id="clean-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="currentColor" className="text-zinc-800/40" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#clean-grid)" />
      </svg>

      {/* ── Layer 2: Connector SVG & Nodes ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Base Static Connection Paths */}
        <path d="M 78 120 L 113 120" fill="none" stroke="currentColor" className="text-white/[0.03]" strokeWidth="1" />
        <path d="M 137 120 L 172 120" fill="none" stroke="currentColor" className="text-white/[0.03]" strokeWidth="1" />
        <path d="M 200 92 L 200 50 L 252 50" fill="none" stroke="currentColor" className="text-white/[0.03]" strokeWidth="1" />
        <path d="M 200 148 L 200 190 L 252 190" fill="none" stroke="currentColor" className="text-white/[0.03]" strokeWidth="1" />

        {/* Animated Flow Overlays */}
        {PATHS.map((p) => {
          const isActive = p.activeSteps.includes(step);
          if (!isActive) return null;

          return (
            <g key={p.id}>
              {/* Outer soft glow stroke - travels once */}
              <motion.path
                d={p.d}
                fill="none"
                stroke="currentColor"
                className={p.colorClass}
                strokeWidth="3.5"
                strokeOpacity="0.2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              {/* Sharp solid flowing stroke - travels once */}
              <motion.path
                d={p.d}
                fill="none"
                stroke="currentColor"
                className={p.colorClass}
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </g>
          );
        })}

        {/* ForeignObjects for Nodes */}
          {NODES.map((node) => {
            const isBox = node.type === 'box';
            const w = isBox ? 56 : 24;
            const h = isBox ? 56 : 24;
            const isActive = isNodeActive(node.id);
            const colorStyles = NODE_COLORS[node.id as keyof typeof NODE_COLORS] || NODE_COLORS.A;

          return (
            <foreignObject
              key={node.id}
              x={node.x - w / 2}
              y={node.y - h / 2}
              width={w}
              height={h}
              className="overflow-visible"
            >
              <div className="w-full h-full flex items-center justify-center">
                {isBox && node.icon ? (
                  <div
                    className={`w-full h-full rounded-[14px] border flex flex-col items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_4px_6px_0_rgba(0,0,0,0.4)] text-white ${colorStyles.buttonBg} ${colorStyles.buttonBorder}`}
                  >
                    {/* Centered Static Icon */}
                    <div className="mb-0.5 flex items-center justify-center">
                      <node.icon className="w-5 h-5" weight="fill" />
                    </div>
                    <span className="text-[8.5px] font-mono font-bold tracking-wider select-none">
                      {node.label}
                    </span>
                  </div>
                ) : (
                  /* Central Router Node Upgrade */
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-300 ${isActive
                      ? "bg-amber-500/20 border-amber-500/70"
                      : "bg-zinc-950/80 border-white/[0.06]"
                      }`}
                  >
                    <motion.div
                      className={`w-2.5 h-2.5 rounded-full border border-dashed ${isActive ? "border-amber-500" : "border-zinc-700"
                        }`}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card2 – Live Token / Cost Monitor
   ───────────────────────────────────────────── */
export function Card2() {
  const bars = [45, 75, 35, 85, 60, 95, 50];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-3.5 justify-between p-1">
      {/* Stats row with sliding offset */}
      <div className="flex gap-3 pt-[0.25rem] pr-[0.25rem] pb-0.5 pl-0.5">
        {[
          { label: "Tokens/min", value: "12.4k", trend: "+8%" },
          { label: "Cost/run", value: "$0.042", trend: "-3%" },
        ].map((s, i) => {
          const isActive = i === activeIdx || hoveredIdx === i;

          return (
            <div key={i} className="flex-1 h-[72px] relative select-none">
              {/* Background Hatched Scale Card */}
              <div
                className="absolute inset-0 rounded-xl border border-white/[0.02] bg-white/[0.01] text-white/[0.04]"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, currentColor 6px, currentColor 7px)",
                }}
              />

              {/* Foreground Card sliding up and right on hover or cycle activation */}
              <motion.div
                className="absolute inset-0 w-full h-full rounded-xl bg-zinc-950/80 border border-white/[0.04] shadow-md p-3 hover:bg-zinc-900/60 transition-colors duration-300 backdrop-blur-[2px] flex items-center justify-between gap-2 cursor-pointer"
                animate={{
                  x: isActive ? "0.3rem" : "0rem",
                  y: isActive ? "-0.3rem" : "0rem",
                }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Left Column: Metric Details */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[7.5px] text-zinc-400 font-mono uppercase tracking-widest leading-none">{s.label}</span>
                  <span className="text-sm font-bold font-mono text-zinc-100 leading-none mt-1.5 tracking-tight">{s.value}</span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className={`text-[8px] font-mono font-bold ${s.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400"
                      }`}>
                      {s.trend}
                    </span>
                    <span className="text-[7.5px] text-zinc-550 font-mono">prev</span>
                  </div>
                </div>

                {/* Right Column: High-Precision Sparkline */}
                <div className="w-10 h-6 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 48 24">
                    <motion.path
                      d={i === 0
                        ? "M 0 18 L 16 11 L 32 14 L 48 4"
                        : "M 0 4 L 16 12 L 32 8 L 48 18"
                      }
                      fill="none"
                      stroke="currentColor"
                      className="text-zinc-500"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                    />

                    {(i === 0
                      ? [{ x: 0, y: 18 }, { x: 16, y: 11 }, { x: 32, y: 14 }, { x: 48, y: 4 }]
                      : [{ x: 0, y: 4 }, { x: 16, y: 12 }, { x: 32, y: 8 }, { x: 48, y: 18 }]
                    ).map((pt, idx) => (
                      <motion.circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="1.5"
                        className="fill-zinc-950 stroke-zinc-500"
                        strokeWidth="1"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + idx * 0.08, duration: 0.25 }}
                      />
                    ))}
                  </svg>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="flex-1 flex items-end gap-2 px-0.5 min-h-[80px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-lg bg-white/[0.01] border border-white/[0.03] relative overflow-hidden text-white/[0.02]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, currentColor 6px, currentColor 7px)",
            }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-amber-500 border-t border-x border-amber-600/50 shadow-[0_0_8px_rgba(245,158,11,0.2)] rounded-t-[6px]"
              initial={{ height: "0%" }}
              animate={{
                height: [
                  `${h}%`,
                  `${Math.min(95, h + 15)}%`,
                  `${Math.max(10, h - 20)}%`,
                  `${Math.min(90, h + 8)}%`,
                  `${h}%`
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 3 + (i % 3) * 0.8,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          </div>
        ))}
      </div>

      {/* X labels */}
      <div className="flex gap-2 px-0.5 mt-1">
        {days.map((d, i) => (
          <p key={i} className="flex-1 text-center text-[7.5px] text-zinc-500 font-mono font-medium">{d}</p>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card3 – Stacked Infinite-Scroll Activity Feed
   ───────────────────────────────────────────── */

const STATUS_ICONS = {
  done: { icon: Check, color: "text-amber-500", bg: "bg-amber-500/15", gradient: "bg-gradient-to-b from-amber-400 to-amber-600", border: "border-amber-600" },
  running: { icon: CircleNotch, color: "text-amber-400", bg: "bg-amber-450/15", gradient: "bg-gradient-to-b from-amber-300 to-amber-500", border: "border-amber-500" },
  waiting: { icon: Clock, color: "text-zinc-550", bg: "bg-white/[0.02]", gradient: "bg-gradient-to-b from-zinc-700 to-zinc-900", border: "border-zinc-800" },
  idle: { icon: Minus, color: "text-zinc-700", bg: "bg-white/[0.01]", gradient: "bg-gradient-to-b from-zinc-800 to-zinc-950", border: "border-zinc-900" },
};

export function Card3() {
  const logs = [
    { agent: "Planner", action: "Decomposed task into 4 sub-goals", status: "done", t: "0.2s" },
    { agent: "Researcher", action: "Synced inbox with server REST API", status: "done", t: "1.4s" },
    { agent: "SyncService", action: "Auto-fetching Gmail SENT mail pipelines…", status: "running", t: "3.1s" },
    { agent: "Parser", action: "Awaiting output from command engine", status: "waiting", t: "—" },
    { agent: "Scheduler", action: "Idle — queued", status: "idle", t: "—" },
  ];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % logs.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [logs.length]);

  const getSlot = (i: number) => {
    const N = logs.length;
    let rel = i - activeIdx;
    if (rel > Math.floor(N / 2)) rel -= N;
    if (rel < -Math.floor(N / 2)) rel += N;
    return rel;
  };

  const Y: Record<string, number> = { "-2": -68, "-1": -38, "0": 0, "1": 38, "2": 68 };

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      {logs.map((l, i) => {
        const slot = getSlot(i);
        const si = STATUS_ICONS[l.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.idle;
        const abs = Math.abs(slot);
        const isActive = slot === 0;
        const isVisible = abs <= 2;

        const yOffset = Y[String(slot)] ?? (slot < 0 ? -120 : 120);
        const scale = isActive ? 1 : abs === 1 ? 0.93 : 0.87;
        const opacity = isActive ? 1 : abs === 1 ? 0.65 : 0.38;
        const zIndex = isActive ? 30 : abs === 1 ? 20 : 10;

        return (
          <motion.div
            key={l.agent}
            className="absolute left-0 right-0 mx-auto px-1.5"
            style={{ zIndex }}
            animate={{
              y: isVisible ? yOffset : slot < 0 ? -150 : 150,
              scale,
              opacity: isVisible ? opacity : 0,
            }}
            transition={{
              y: { type: "spring", stiffness: 500, damping: 35 },
              scale: { type: "spring", stiffness: 500, damping: 35 },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
          >
            <div className={`w-full rounded-2xl border flex items-center gap-2.5 ${isActive
              ? "px-3 py-2.5 bg-zinc-900/80 border-white/[0.08]"
              : "px-2.5 py-1.5 bg-zinc-950/40 border-white/[0.03]"
              }`}>

              {/* Icon badge */}
              <div className={`shrink-0 rounded-[8px] flex items-center justify-center font-bold text-white transition-all duration-300 ${si.gradient} border ${si.border} shadow-md ${isActive ? "w-8 h-8" : "w-5 h-5"
                }`}>
                <si.icon weight="bold" className={`${isActive ? "w-4 h-4" : "w-2.5 h-2.5"} ${l.status === "running" ? "animate-spin" : ""}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono font-semibold text-zinc-150 leading-none ${isActive ? "text-[10px]" : "text-[9px]"
                    }`}>{l.agent}</span>
                  <span className={`font-mono uppercase tracking-wide rounded px-1.5 py-0.5 bg-white/[0.03] text-zinc-400 ${isActive ? "text-[7px]" : "text-[6px]"
                    }`}>{l.status}</span>
                </div>
                {isActive && (
                  <p className="text-[9px] text-zinc-455 truncate mt-0.5 leading-tight">{l.action}</p>
                )}
              </div>

              {isActive && (
                <span className="text-[9px] font-mono text-zinc-500 shrink-0">{l.t}</span>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Progress dots */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
        {logs.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-amber-500/50"
            animate={{
              width: i === activeIdx ? 14 : 4,
              opacity: i === activeIdx ? 0.7 : 0.2,
            }}
            style={{ height: 3 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card4 – Memory / Knowledge Base Namespaces
   ───────────────────────────────────────────── */

const NS_ICONS = {
  codebase: Code,
  docs: FileText,
  slack: SlackLogo,
  notion: NotionLogo,
};

const NS_COLORS = {
  codebase: { bar: "from-amber-400 to-amber-500", dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-450", buttonBg: "bg-amber-500", buttonBorder: "border-amber-600" },
  docs: { bar: "from-zinc-650 to-zinc-500", dot: "bg-zinc-550", badge: "bg-white/[0.05] text-zinc-400", buttonBg: "bg-zinc-700", buttonBorder: "border-zinc-800" },
  slack: { bar: "from-amber-500 to-orange-500", dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-455", buttonBg: "bg-orange-500", buttonBorder: "border-orange-600" },
  notion: { bar: "from-zinc-500 to-zinc-300", dot: "bg-zinc-300", badge: "bg-white/[0.08] text-zinc-300", buttonBg: "bg-zinc-400", buttonBorder: "border-zinc-500" },
};

const RETRIEVAL_QUERIES = [
  { ns: "codebase", q: "google OAuth client sync route", t: "0.2s" },
  { ns: "docs", q: "Gmail IMAP refresh sync endpoints", t: "1.1s" },
  { ns: "codebase", q: "Gmail database drafts mapping schema", t: "2.4s" },
  { ns: "slack", q: "sent email api integration #dev", t: "4.0s" },
  { ns: "notion", q: "Command Bar preview action objects", t: "5.8s" },
  { ns: "docs", q: "BetterAuth session endpoint config", t: "7.2s" },
];

export function Card4() {
  const namespaces = [
    { name: "codebase", hits: 342, fill: 88 },
    { name: "docs", hits: 218, fill: 56 },
    { name: "slack", hits: 97, fill: 25 },
    { name: "notion", hits: 54, fill: 14 },
  ];

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => (prev + 1) % RETRIEVAL_QUERIES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const activeNs = RETRIEVAL_QUERIES[tick]?.ns ?? "codebase";
  const recentQueries = [0, 1, 2, 3]
    .map((offset) => RETRIEVAL_QUERIES[(tick - offset + RETRIEVAL_QUERIES.length) % RETRIEVAL_QUERIES.length])
    .filter((q): q is typeof RETRIEVAL_QUERIES[number] => !!q);

  return (
    <div className="w-full h-full flex gap-4 py-2 px-3">
      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col gap-0 min-w-0 pr-1">
        <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-550 mb-2">Namespaces</p>

        <div className="flex flex-col gap-2.5 flex-1">
          {namespaces.map((ns, i) => {
            const c = NS_COLORS[ns.name as keyof typeof NS_COLORS] || NS_COLORS.codebase;
            const isActive = ns.name === activeNs;
            const Icon = (NS_ICONS[ns.name as keyof typeof NS_ICONS] || Database) as React.ComponentType<{ size?: number; weight?: string; className?: string }>;

            return (
              <div key={ns.name} className="flex items-center gap-2 group relative">
                <div
                  className={`relative flex shrink-0 items-center justify-center w-[30px] h-[30px] rounded-[10px] border transition-all duration-500 ${isActive ? `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_6px_0_rgba(0,0,0,0.3)] text-white ${c.buttonBg} ${c.buttonBorder} scale-105` : 'bg-zinc-900/40 border-white/[0.03] text-zinc-400'}`}
                >
                  <Icon size={14} weight={isActive ? "fill" : "regular"} className="relative z-10" />
                </div>

                <span className={`text-[9.5px] font-mono w-14 shrink-0 transition-colors duration-300 ${isActive ? "text-zinc-200 font-semibold" : "text-zinc-500"}`}>
                  {ns.name}
                </span>

                <div className="flex-1 h-1 bg-white/[0.02] rounded-full overflow-hidden relative">
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${c.bar}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${ns.fill}%`, opacity: isActive ? 1 : 0.25 }}
                    transition={{
                      width: { duration: 1.2, delay: i * 0.1, type: "spring", bounce: 0.2 },
                      opacity: { duration: 0.4 },
                    }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                  </motion.div>
                </div>

                <div className="flex items-center gap-1 w-8 justify-end">
                  <span className={`text-[9px] font-mono font-medium ${isActive ? "text-zinc-200" : "text-zinc-550"}`}>
                    {ns.hits}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 pt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[8px] font-mono text-zinc-550 font-medium tracking-wide">Live retrieval active</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/[0.04] self-stretch shrink-0" />

      {/* ── Right panel ── */}
      <div className="w-[150px] shrink-0 flex flex-col gap-0">
        <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-550 mb-2">Retrieval Log</p>

        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {recentQueries.map((q, qi) => {
            const c = NS_COLORS[q.ns as keyof typeof NS_COLORS] || NS_COLORS.codebase;
            return (
              <motion.div
                key={`${q.ns}-${q.q}-${qi}`}
                className="rounded-xl border border-white/[0.04] bg-zinc-900/40 px-2 py-1.5"
                initial={{ opacity: 0, y: -8 }}
                animate={{
                  opacity: qi === 0 ? 1 : qi === 1 ? 0.75 : qi === 2 ? 0.45 : 0.2,
                  y: 0,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35, delay: qi * 0.05 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[6px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded-md ${c.badge}`}>
                    {q.ns}
                  </span>
                  <span className="text-[6.5px] font-mono text-zinc-650 ml-auto tabular-nums">{q.t}</span>
                </div>
                <p className="text-[8px] text-zinc-300 leading-tight font-mono truncate">{q.q}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card5 – Tool Call Inspector
   ───────────────────────────────────────────── */
export function Card5() {
  const tools = [
    { name: "web_search", calls: 14, icon: Globe, latency: "280ms", color: "bg-gradient-to-b from-amber-400 to-amber-600", borderColor: "border-amber-600" },
    { name: "code_exec", calls: 8, icon: TerminalWindow, latency: "1.2s", color: "bg-gradient-to-b from-zinc-700 to-zinc-900", borderColor: "border-zinc-850" },
    { name: "file_read", calls: 22, icon: FileText, latency: "12ms", color: "bg-gradient-to-b from-amber-500 to-orange-600", borderColor: "border-orange-600" },
    { name: "vector_query", calls: 31, icon: Brain, latency: "95ms", color: "bg-gradient-to-b from-zinc-800 to-zinc-950", borderColor: "border-zinc-900" },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <div className="grid grid-cols-2 gap-2 w-full">
        {tools.map((t, i) => (
          <motion.div
            key={i}
            className="relative rounded-[16px] border border-white/[0.04] bg-zinc-900/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between p-2.5 group hover:border-white/[0.08]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-start justify-between">
              <div className={`w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-white ${t.color} border ${t.borderColor} shadow-md group-hover:scale-105 transition-transform duration-300`}>
                <t.icon weight="fill" className="w-3.5 h-3.5 relative z-10" />
              </div>

              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[11px] font-mono font-bold text-zinc-100 leading-none">{t.calls}</span>
                <span className="text-[6.5px] font-mono text-zinc-550 uppercase tracking-widest leading-none">Calls</span>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-mono font-medium text-zinc-200 tracking-tight">{t.name}</span>
                <span className="text-[7.5px] font-mono text-zinc-550 tabular-nums">{t.latency}</span>
              </div>
              <div className="w-full h-1 bg-white/[0.02] rounded-full overflow-hidden relative">
                <motion.div
                  className={`absolute left-0 top-0 bottom-0 rounded-full ${t.color}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${(t.calls / 31) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Grid Component
   ───────────────────────────────────────────── */
const CARDS = [
  {
    title: "Agent Pipeline",
    description: "Visualise how tasks flow across your multi-agent graph in real time.",
    visual: <Card1 />,
    colSpan: "lg:col-span-1",
    height: "h-[250px]",
  },
  {
    title: "Token Monitor",
    description: "Track LLM token usage and cost-per-run across every model call.",
    visual: <Card2 />,
    colSpan: "lg:col-span-1",
    height: "h-[250px]",
  },
  {
    title: "Activity Feed",
    description: "Real-time logs of agent actions, tool calls, and memory retrievals.",
    visual: <Card3 />,
    colSpan: "lg:col-span-1",
    height: "h-[250px]",
  },
  {
    title: "Knowledge Base",
    description: "Semantic search across documents, codebases, and conversations.",
    visual: <Card4 />,
    colSpan: "lg:col-span-2",
    height: "h-[250px]",
  },
  {
    title: "Tool Inspector",
    description: "Monitor tool usage, latency, and success rates across all agents.",
    visual: <Card5 />,
    colSpan: "lg:col-span-1",
    height: "h-[250px]",
  }
];

export interface AgentBentoGridProps {
  className?: string;
}

export function AgentBentoGrid({ className }: AgentBentoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl mx-auto", className)}>
      {CARDS.map((card, idx) => (
        <FeatCard
          key={idx}
          title={card.title}
          description={card.description}
          className={cn(card.colSpan, card.height)}
        >
          {card.visual}
        </FeatCard>
      ))}
    </div>
  );
}

export default AgentBentoGrid;
