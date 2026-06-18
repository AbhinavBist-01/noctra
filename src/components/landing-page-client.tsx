"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PaperPlaneTilt, 
  CalendarBlank, 
  Sparkle, 
  Check, 
  ArrowRight,
  Clock,
  EnvelopeSimple,
  ArrowClockwise,
  User,
  GithubLogo,
  TwitterLogo,
  LinkedinLogo,
  Terminal,
  ArrowsLeftRight,
  Lightning,
  Sliders,
  ShieldCheck
} from "@phosphor-icons/react";
import AnimatedRays from "@/components/ui/animated-rays";
import MorphText from "@/components/ui/morph-text";
import ElasticStack from "@/components/ui/elastic-stack";
import AgentBentoGrid from "@/components/ui/agent-bento-grid";
import FlipFadeText from "@/components/ui/flip-fade-text";

interface EmailDraftResult {
  type: "email_draft";
  to: string;
  subject: string;
  body: string;
  priority: string;
}

interface CalendarInviteResult {
  type: "calendar_invite";
  title: string;
  attendees: string[];
  time: string;
  description: string;
}

interface ChainAction {
  type: "email_send" | "calendar_invite";
  to?: string;
  subject?: string;
  body?: string;
  title?: string;
  time?: string;
  attendees?: string[];
}

interface ChainResult {
  type: "chain";
  actions: ChainAction[];
}

type PresetResult = EmailDraftResult | CalendarInviteResult | ChainResult;

interface Preset {
  label: string;
  command: string;
  type: string;
  result: PresetResult;
}

// Preset Commands data
const PRESETS: Preset[] = [
  {
    label: "Draft Sick Leave",
    command: "Draft email to manager@corp.com with subject Sick Leave saying I will be out today with a high fever",
    type: "email_draft",
    result: {
      type: "email_draft",
      to: "manager@corp.com",
      subject: "Sick Leave",
      body: "I will be out today with a high fever. I have a doctor appointment scheduled and will keep you updated.",
      priority: "high"
    }
  },
  {
    label: "Schedule Design Review",
    command: "Schedule calendar invite for Design Review at 3:00pm today with design-team@noctra.com",
    type: "calendar_invite",
    result: {
      type: "calendar_invite",
      title: "Design Review",
      attendees: ["design-team@noctra.com"],
      time: "3:00 PM - 4:00 PM (Today)",
      description: "Review current design files, spacing tokens, and custom UI micro-animations."
    }
  },
  {
    label: "Chain Email & Event",
    command: "Send email to client@acme.com subject Follow Up. Invite client@acme.com to Meeting on Friday at 9am",
    type: "chain",
    result: {
      type: "chain",
      actions: [
        {
          type: "email_send",
          to: "client@acme.com",
          subject: "Follow Up",
          body: "Great speaking with you today. Looking forward to our scheduled sync."
        },
        {
          type: "calendar_invite",
          title: "Acme Sync",
          attendees: ["client@acme.com"],
          time: "9:00 AM - 10:00 AM (Friday)"
        }
      ]
    }
  }
];

// Custom Bat-winged backlit NOCTRA Logo SVG
function NoctraLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center gap-2 select-none group/logo ${className}`}>
      {/* Backlit Golden-Amber Glow (matching user reference) */}
      <div className="absolute -inset-2 rounded-lg bg-amber-500/10 blur-md opacity-50 group-hover/logo:opacity-90 transition-opacity duration-500 pointer-events-none" />
      
      <svg
        viewBox="0 0 170 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-auto text-amber-500 fill-current drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-logo-glow transition-all duration-300"
      >
        {/* Bat Wing 'N' */}
        <path
          d="M 28 8 
             C 20 9, 14 12, 6 15 
             C 10 18, 11 21, 10 25 
             C 14 24, 18 25, 21 28 
             C 22 24, 25 22, 28 21 
             C 27 26, 27 29, 28 32
             L 34 32
             L 34 8 
             Z"
          fill="currentColor"
        />
        {/* Diagonal & Right Vertical leg of 'N' */}
        <path
          d="M 34 8 L 47 32 L 53 32 L 53 8 L 47 8 L 47 25 L 34 8 Z"
          fill="currentColor"
        />
        {/* O */}
        <path
          d="M 69 8 C 61.8 8, 56 13.4, 56 20 C 56 26.6, 61.8 32, 69 32 C 76.2 32, 82 26.6, 82 20 C 82 13.4, 76.2 8, 69 8 Z M 69 13.5 C 73 13.5, 76 16.2, 76 20 C 76 23.8, 73 26.5, 69 26.5 C 65 26.5, 62 23.8, 62 20 C 62 16.2, 65 13.5, 69 13.5 Z"
          fill="currentColor"
        />
        {/* C */}
        <path
          d="M 97 13.5 L 97 8 C 89.8 8, 85 13.4, 85 20 C 85 26.6, 89.8 32, 97 32 L 97 26.5 C 93 26.5, 91 23.8, 91 20 C 91 16.2, 93 13.5, 97 13.5 Z"
          fill="currentColor"
        />
        {/* T */}
        <path
          d="M 100 8 L 100 13.5 L 106 13.5 L 106 32 L 112 32 L 112 13.5 L 118 13.5 L 118 8 Z"
          fill="currentColor"
        />
        {/* R */}
        <path
          d="M 122 8 L 122 32 L 128 32 L 128 22.5 L 133 32 L 140 32 L 133.5 21 C 137.5 19.5, 139 16.5, 139 13.5 C 139 10, 136 8, 129 8 L 122 8 Z M 128 13.5 L 129.5 13.5 C 132 13.5, 133 14.5, 133 15.7 C 133 17, 132 18, 129.5 18 L 128 18 L 128 13.5 Z"
          fill="currentColor"
        />
        {/* A */}
        <path
          d="M 149 8 L 142 32 L 148 32 L 150 25 L 157 25 L 159 32 L 165 32 L 158 8 L 149 8 Z M 151.5 20 L 153.5 13.5 L 155.5 20 L 151.5 20 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

const workspaceTools = [
  { id: 1, name: "Gmail", image: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" },
  { id: 2, name: "Google Calendar", image: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" },
];

export default function LandingPageClient() {
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showResult, setShowResult] = useState<PresetResult | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll listener for sticky navbar animation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Stop typing on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handlePresetSelect = (index: number) => {
    if (isTyping || isParsing) return;
    
    setActivePreset(index);
    setIsTyping(true);
    setShowResult(null);
    setInputText("");

    const fullText = PRESETS[index]!.command;
    let currentIdx = 0;

    const typeChar = () => {
      if (currentIdx < fullText.length) {
        setInputText((prev) => prev + fullText[currentIdx]);
        currentIdx++;
        // Speed up typing for demo feel
        typingTimeoutRef.current = setTimeout(typeChar, 10 + Math.random() * 8);
      } else {
        setIsTyping(false);
        setIsParsing(true);
        // Simulate parsing delay
        typingTimeoutRef.current = setTimeout(() => {
          setIsParsing(false);
          setShowResult(PRESETS[index]!.result);
        }, 1000);
      }
    };

    typeChar();
  };

  const resetSandbox = () => {
    if (isTyping || isParsing) return;
    setActivePreset(null);
    setInputText("");
    setShowResult(null);
  };

  // Fixed visual layout constants (removing dials adjustability per user feedback)
  const dynamicBorderRadius = "16px";
  const dynamicPadding = "18px";
  const dynamicGap = "14px";
  const dynamicSpring = {
    type: "spring" as const,
    stiffness: 150,
    damping: 17,
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020206] text-zinc-100 overflow-x-hidden font-sans">
      
      {/* Animated Aurora Rays Background */}
      <div className="absolute inset-0 z-0 h-[90vh] w-full pointer-events-none opacity-45">
        <AnimatedRays className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020206]/70 to-[#020206]" />
      </div>

      {/* Grid Pattern overlay for depth */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, #f59e0b 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />

      {/* Floating Glassmorphic Navbar (Sticky with smooth scroll transition) */}
      <div 
        className={`w-full sticky top-0 z-50 transition-all duration-500 ease-in-out ${
          scrolled 
            ? "py-3 bg-[#020206]/60 backdrop-blur-md border-b border-white/[0.01] shadow-lg shadow-black/10" 
            : "py-6 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header 
            className={`rounded-full px-6 flex items-center justify-between border backdrop-blur-md transition-all duration-500 ease-in-out ${
              scrolled 
                ? "py-2.5 bg-zinc-950/90 border-amber-500/25 shadow-[0_0_25px_rgba(245,158,11,0.12)]" 
                : "py-3.5 bg-[#020206]/60 border-white/[0.04] shadow-2xl shadow-black/80"
            }`}
          >
            <Link href="/" className="outline-none">
              <NoctraLogo className="h-8" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#sandbox" className="text-xs font-mono text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">
                Sandbox
              </a>
              <a href="#workflow" className="text-xs font-mono text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">
                Workflow
              </a>
              <a href="#features" className="text-xs font-mono text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">
                Features
              </a>
              <a href="#how-to-use" className="text-xs font-mono text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">
                How to Use
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/signin"
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors uppercase tracking-widest px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-amber-300 hover:bg-amber-200 px-5 py-2 text-xs font-mono font-bold text-zinc-950 transition-all duration-300 hover:shadow-lg hover:shadow-amber-300/25 hover:scale-[1.03]"
              >
                Get Started
              </Link>
            </div>
          </header>
        </div>
      </div>

      {/* Centered Hero Section with Glass Card Backdrop */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-12 text-center flex flex-col items-center">
        {/* Centered Glass Panel Card containing the main hero text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="glass-panel p-8 sm:p-14 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/90 flex flex-col items-center gap-6 border border-white/[0.03] w-full"
        >
          {/* Inner Ambient Glow behind text */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[300px] bg-amber-500/5 rounded-full blur-[110px] pointer-events-none" />

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight max-w-2xl flex flex-col items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-500">
              Your workspace,
            </span>
            <MorphText
              words={["RULED BY YOUR WORDS", "DRIVEN BY ACTIONS", "SYNCED WITH GMAIL", "AUTO-SCHEDULED"]}
              interval={2500}
              fontFamily="inherit"
              className="mt-2"
              textClassName="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600"
            />
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl">
            Manage Gmail & Google Calendar using natural language. Send, draft, and schedule multi-step actions in one swift sentence. Designed for speed, styled for the night.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-zinc-950 font-extrabold px-8 py-4 text-base transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-300/20 hover:shadow-amber-300/35 group"
            >
              <span>Start Commanding</span>
              <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#sandbox"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] px-8 py-4 text-base font-semibold text-zinc-300 transition-all duration-300"
            >
              <span>Play with Demo</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Floating Connected Apps Indicator (ElasticStack) below Hero, aligned to the right */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 mb-4 flex justify-end w-full">
        <div className="flex items-center gap-3 bg-zinc-950/40 border border-white/[0.04] rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg select-none">
          <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest">Workspace Nodes</span>
          <ElasticStack 
            items={workspaceTools}
            itemSize={24}
            overlap={8}
            pushForce={6}
            className="py-0.5"
          />
        </div>
      </div>

      {/* Main Interactive Sandbox Terminal (Centered, dials removed per request) */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col gap-6" id="sandbox">
        <motion.div 
          layout
          style={{ 
            borderRadius: dynamicBorderRadius,
            transformOrigin: "center top",
          }}
          transition={dynamicSpring}
          className="relative border border-white/[0.04] bg-zinc-950/60 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col w-full"
        >
          {/* Header window controls */}
          <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3.5 bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/40" />
              <span className="h-3 w-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
              <span className="ml-2 text-xs font-mono text-zinc-500">interactive-preview-desk.sh</span>
            </div>
            <div className="flex items-center gap-2">
              {(inputText || showResult) && (
                <button 
                  onClick={resetSandbox} 
                  className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ArrowClockwise size={12} />
                  <span>Reset Console</span>
                </button>
              )}
            </div>
          </div>

          {/* Sandbox Console Input */}
          <div className="p-4 border-b border-white/[0.04] bg-zinc-950/20">
            <div className="flex items-center gap-3 bg-zinc-950/60 rounded-xl border border-white/[0.05] px-4 py-3">
              <span className="text-xs font-mono text-zinc-600 select-none">CMD</span>
              <input 
                type="text" 
                value={inputText}
                readOnly
                placeholder="Click a preset below to stream text command..."
                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 font-mono"
              />
              <div className="flex items-center gap-2">
                {isParsing && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Parsing...</span>
                  </div>
                )}
                {showResult && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                    <Check size={14} />
                    <span>Parsed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preset buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(idx)}
                  disabled={isTyping || isParsing}
                  className={`rounded-lg px-4 py-2 text-xs font-mono transition-all border ${
                    activePreset === idx
                      ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm"
                      : "bg-zinc-900/40 border-white/[0.03] hover:border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Output Panel */}
          <div 
            style={{ padding: dynamicPadding }}
            className="flex flex-col gap-4 min-h-[220px] bg-zinc-950/20"
          >
            <AnimatePresence mode="wait">
              {/* Empty State */}
              {!inputText && !showResult && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-8"
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-zinc-900/60 border border-white/[0.04] text-zinc-600 mb-3">
                    <PaperPlaneTilt size={18} />
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">No command loaded.</span>
                  <p className="text-[11px] text-zinc-600 mt-1 max-w-sm font-mono">
                    Click a preset button above to watch Noctra parse semantic text variables into Workspace execution payloads.
                  </p>
                </motion.div>
              )}

              {/* Loading State */}
              {isParsing && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4"
                >
                  <FlipFadeText 
                    words={["MAPPING OAUTH", "RESOLVING LABELS", "PARSING VARIABLES", "STAGING PAYLOAD"]}
                    interval={1200}
                    className="min-h-[60px]"
                    textClassName="text-xl md:text-2xl font-mono tracking-wider text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  />
                  <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-[0.2em] animate-pulse">
                    Synthesizing JSON commands
                  </span>
                </motion.div>
              )}

              {/* Results Renderer */}
              {showResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={dynamicSpring}
                  className="flex flex-col w-full h-full"
                  style={{ gap: dynamicGap }}
                >
                  {/* Render Email Card */}
                  {showResult.type === "email_draft" && (
                    <div className="border border-amber-500/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#0e0802] rounded-xl overflow-hidden w-full shadow-[0_0_30px_rgba(245,158,11,0.08)] hover:shadow-[0_0_35px_rgba(245,158,11,0.2)] hover:border-amber-500/35 transition-all duration-300">
                      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 bg-amber-500/10 text-[10px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                          <span className="font-bold text-amber-400 tracking-wider">GMAIL DRAFT GENERATED</span>
                        </span>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] px-2 py-0.5 rounded uppercase text-[9px] font-bold">
                          {showResult.priority} priority
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        <div className="grid grid-cols-12 gap-1 border-b border-white/[0.03] pb-2 text-xs">
                          <span className="col-span-2 text-amber-500/80 font-mono font-bold">To:</span>
                          <span className="col-span-10 text-zinc-300 font-semibold font-mono">{showResult.to}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1 border-b border-white/[0.03] pb-2 text-xs">
                          <span className="col-span-2 text-amber-500/80 font-mono font-bold">Subject:</span>
                          <span className="col-span-10 text-zinc-100 font-bold">{showResult.subject}</span>
                        </div>
                        <div className="text-xs text-zinc-250 mt-1 font-mono leading-relaxed bg-zinc-950/90 p-3.5 rounded-lg border border-amber-500/15 shadow-inner">
                          {showResult.body}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Calendar Card */}
                  {showResult.type === "calendar_invite" && (
                    <div className="border border-cyan-500/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#020e14] rounded-xl overflow-hidden w-full shadow-[0_0_30px_rgba(34,211,238,0.08)] hover:shadow-[0_0_35px_rgba(34,211,238,0.20)] hover:border-cyan-500/45 transition-all duration-300">
                      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 bg-cyan-500/10 text-[10px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                          <span className="font-bold text-cyan-400 tracking-wider">CALENDAR EVENT STAGED</span>
                        </span>
                        <span className="text-cyan-350 flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/35 px-2 py-0.5 rounded text-[9px] font-bold font-mono shadow-[0_0_10px_rgba(34,211,238,0.15)]">
                          <Clock size={11} />
                          <span>1 hr duration</span>
                        </span>
                      </div>
                      <div className="p-4 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                          <CalendarBlank size={22} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div>
                            <div className="text-sm font-bold text-zinc-100 truncate">{showResult.title}</div>
                            <div className="text-xs text-cyan-300 font-mono font-bold mt-1.5 bg-cyan-950/80 border border-cyan-500/25 w-fit px-2.5 py-0.5 rounded shadow-sm">{showResult.time}</div>
                          </div>
                          <div className="text-xs text-zinc-300 border-t border-white/[0.04] pt-2.5 leading-relaxed font-mono">
                            {showResult.description}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {showResult.attendees.map((email: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1.5 bg-zinc-800/80 border border-cyan-500/10 px-2 py-0.5 rounded text-[10px] text-zinc-300 font-mono hover:border-cyan-500/30 transition-all cursor-default">
                                <User size={9} />
                                <span>{email}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Chain Multi-action Card */}
                  {showResult.type === "chain" && (
                    <div className="flex flex-col" style={{ gap: dynamicGap }}>
                      {showResult.actions.map((act: ChainAction, i: number) => {
                        const isEmail = act.type === "email_send";
                        const themeBorder = isEmail ? "border-amber-500/20 hover:border-amber-500/35" : "border-cyan-500/20 hover:border-cyan-500/40";
                        const themeBg = isEmail ? "bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#0e0802]" : "bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#020e14]";
                        const themeHeaderBg = isEmail ? "bg-amber-500/10" : "bg-cyan-500/10";
                        const themeHeaderText = isEmail ? "text-amber-400 font-bold" : "text-cyan-400 font-bold";
                        const themeIconBg = isEmail ? "bg-amber-500/20" : "bg-cyan-500/20";
                        const themeIconText = isEmail ? "text-amber-400" : "text-cyan-300";
                        const themeDot = isEmail ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]";
                        const themeGlowShadow = isEmail ? "shadow-[0_0_25px_rgba(245,158,11,0.06)] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]" : "shadow-[0_0_25px_rgba(34,211,238,0.06)] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]";

                        return (
                          <div 
                            key={i} 
                            className={`border ${themeBorder} ${themeBg} rounded-xl overflow-hidden w-full relative ${themeGlowShadow} transition-all duration-300`}
                          >
                            {/* Visual dotted vertical connector lines between chain action nodes */}
                            {i < showResult.actions.length - 1 && (
                              <div className="absolute left-9 top-14 bottom-[-16px] w-[1px] border-l border-dashed border-zinc-700/50 z-0 pointer-events-none" />
                            )}
                            
                            <div className={`flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 ${themeHeaderBg} text-[9px] font-mono ${themeHeaderText} uppercase tracking-wider font-bold`}>
                              <span className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${themeDot} animate-pulse`} />
                                <span>Flow Step {i + 1}: {act.type.replace("_", " ")}</span>
                              </span>
                            </div>
                            
                            <div className="p-4 text-xs flex flex-col gap-2 relative z-10">
                              {isEmail ? (
                                <>
                                  <div className="flex gap-2 font-mono text-[11px]"><span className="text-amber-500/80 font-bold w-12 shrink-0">To:</span><span className="text-zinc-300 font-semibold">{act.to}</span></div>
                                  <div className="flex gap-2 font-mono text-[11px]"><span className="text-amber-500/80 font-bold w-12 shrink-0">Subject:</span><span className="text-zinc-100 font-bold">{act.subject}</span></div>
                                  <div className="text-[11px] text-zinc-300 bg-zinc-950/90 p-3 rounded-lg mt-1 font-mono border border-amber-500/10 leading-relaxed shadow-inner">{act.body}</div>
                                </>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className={`h-11 w-11 rounded-xl ${themeIconBg} flex items-center justify-center ${themeIconText} border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]`}>
                                    <CalendarBlank size={20} />
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-100 text-sm">{act.title}</div>
                                    <div className="text-[10px] text-cyan-300 font-mono font-bold mt-1.5 bg-cyan-950/80 border border-cyan-500/20 w-fit px-2.5 py-0.5 rounded shadow-sm">{act.time}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Interactive Integrations Flow Diagram (Moved right after the sandbox terminal as requested) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/[0.03]" id="workflow">
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Workspace Sync</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Zero friction API pipelines</h3>
          <p className="text-zinc-500 text-sm">Direct, secure connection to Google services with real-time feedback loops.</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/[0.03] max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-xl shadow-black/35">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-[0.01] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Input Block */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-full md:w-auto">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
              <Terminal size={24} />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-zinc-200">Noctra Client</div>
              <div className="text-[10px] font-mono text-zinc-500">Keyboard Input</div>
            </div>
          </div>

          {/* SVG Animated Connector 1 */}
          <div className="hidden md:block flex-1 h-16 relative">
            <svg className="w-full h-full" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 20 Q 50 5 100 20 T 200 20" stroke="rgba(245,158,11,0.12)" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M 0 20 Q 50 5 100 20 T 200 20" stroke="url(#amberGradient)" strokeWidth="2" strokeDasharray="20 120" strokeDashoffset="0">
                <animate attributeName="stroke-dashoffset" values="140;0" dur="4s" repeatCount="indefinite" />
              </path>
              <defs>
                <linearGradient id="amberGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Central Parser */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-full md:w-auto">
            <div className="h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10 animate-pulse-slow">
              <Sparkle size={28} weight="fill" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-zinc-100">AI Parser Engine</div>
              <div className="text-[10px] font-mono text-amber-500">Semantic Parsing</div>
            </div>
          </div>

          {/* SVG Animated Connector 2 */}
          <div className="hidden md:block flex-1 h-16 relative">
            <svg className="w-full h-full" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 20 C 50 35, 150 5, 200 20" stroke="rgba(245,158,11,0.12)" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M 0 20 C 50 35, 150 5, 200 20" stroke="url(#amberGradient2)" strokeWidth="2" strokeDasharray="20 120" strokeDashoffset="0">
                <animate attributeName="stroke-dashoffset" values="140;0" dur="3s" repeatCount="indefinite" />
              </path>
              <defs>
                <linearGradient id="amberGradient2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Google Workspace endpoints */}
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 w-full md:w-auto">
            {/* Gmail Block */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <EnvelopeSimple size={20} />
              </div>
              <div className="text-[10px] font-mono text-zinc-400">Gmail API</div>
            </div>

            {/* Calendar Block */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <CalendarBlank size={20} />
              </div>
              <div className="text-[10px] font-mono text-zinc-400">Google Calendar</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.03]" id="features">
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Core Capabilities</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Built for speed, styled for the night</h3>
          <p className="text-zinc-500 text-sm">No complex dropdowns or calendar picking. Type, review, and confirm.</p>
        </div>

        <AgentBentoGrid />
      </section>

      {/* How to Use Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.03]" id="how-to-use">
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Interactive Workflow</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How to Use Noctra</h3>
          <p className="text-zinc-500 text-sm">Follow three easy steps to automate your day-to-day Workspace workflow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* SVG Connector Line running between cards on desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/15 to-transparent -translate-y-12 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 glass-panel rounded-2xl p-7 flex flex-col gap-4 border border-white/[0.03] hover:border-amber-500/20 transition-colors duration-300">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-mono font-bold text-sm">
              01
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Connect Google Workspace</h4>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-mono">
                Link your Google account securely using OAuth. Noctra only accesses API scopes for Gmail drafts and Calendar entries you explicitly command.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 glass-panel rounded-2xl p-7 flex flex-col gap-4 border border-white/[0.03] hover:border-amber-500/20 transition-colors duration-300">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-mono font-bold text-sm">
              02
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Type Your Command</h4>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-mono">
                Type naturally in plain English. Write simple directives like "Draft sick leave to my manager" or compound flows like "Email client and book a sync".
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 glass-panel rounded-2xl p-7 flex flex-col gap-4 border border-white/[0.03] hover:border-amber-500/20 transition-colors duration-300">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-mono font-bold text-sm">
              03
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Review & Execute</h4>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-mono">
                Verify the extracted visual parameters in the command desk, edit any fields manually if needed, and confirm execution with a single keyboard shortcut.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Multi-Column Footer */}
      <footer className="relative z-10 border-t border-white/[0.03] bg-zinc-950/80 backdrop-blur-md pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <NoctraLogo className="h-8" />
            <p className="text-xs font-mono text-zinc-500 leading-relaxed max-w-sm">
              The high-agency keyboard interface for Google Workspace. Speed up your workflow with natural language command parsing.
            </p>
            {/* Operational Status badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 w-fit mt-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Product links */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-widest font-bold">Product</h4>
            <div className="flex flex-col gap-2.5 text-xs font-mono text-zinc-500">
              <a href="#sandbox" className="hover:text-amber-500 transition-colors">Sandbox</a>
              <a href="#workflow" className="hover:text-amber-500 transition-colors">Workflow</a>
              <a href="#features" className="hover:text-amber-500 transition-colors">Features</a>
              <a href="#how-to-use" className="hover:text-amber-500 transition-colors">How to Use</a>
            </div>
          </div>

          {/* Resources links */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-widest font-bold">Resources</h4>
            <div className="flex flex-col gap-2.5 text-xs font-mono text-zinc-500">
              <span className="cursor-not-allowed text-zinc-700 select-none">Documentation</span>
              <span className="cursor-not-allowed text-zinc-700 select-none">API reference</span>
              <span className="cursor-not-allowed text-zinc-700 select-none">Changelog</span>
              <span className="cursor-not-allowed text-zinc-700 select-none">System Status</span>
            </div>
          </div>

          {/* Newsletter Form */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-xs font-mono text-zinc-300 uppercase tracking-widest font-bold">Stay updated</h4>
            <p className="text-xs font-mono text-zinc-500 leading-relaxed">
              Subscribe to get feature updates, shortcuts, and release announcements.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-200 outline-none focus:border-amber-500/50 w-full placeholder:text-zinc-600 transition-colors"
              />
              <button
                onClick={() => alert("Subscribed!")}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all hover:scale-[1.02] shrink-0"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-600">
          <span>&copy; 2026 Noctra. Crafted with bat-wings.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
            <div className="flex gap-3 text-zinc-500 pl-4 border-l border-zinc-800">
              <a href="https://github.com/AbhinavBist-01" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-amber-500 transition-colors">
                <GithubLogo size={16} />
              </a>
              <a href="https://x.com/abhinav1_twt" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-amber-500 transition-colors">
                <TwitterLogo size={16} />
              </a>
              <a href="https://www.linkedin.com/in/abhinavsingh015" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-amber-500 transition-colors">
                <LinkedinLogo size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
