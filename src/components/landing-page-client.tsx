"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PaperPlaneTilt, 
  CalendarBlank, 
  Sliders, 
  Sparkle, 
  Check, 
  ArrowRight,
  Clock,
  EnvelopeSimple,
  ArrowClockwise,
  User
} from "@phosphor-icons/react";
import AnimatedRays from "@/components/ui/animated-rays";

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

export default function LandingPageClient() {
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showResult, setShowResult] = useState<PresetResult | null>(null);
  
  // Design Engine Dials (representing design engineering guidelines)
  const [variance, setVariance] = useState(4); // 1 = Symmetric, 10 = Artsy/Brutalist
  const [motionIntensity, setMotionIntensity] = useState(6); // 1 = Static, 10 = High spring physics
  const [visualDensity, setVisualDensity] = useState(5); // 1 = Airy gallery, 10 = Compact cockpit

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        typingTimeoutRef.current = setTimeout(typeChar, 12 + Math.random() * 10);
      } else {
        setIsTyping(false);
        setIsParsing(true);
        // Simulate parsing delay
        typingTimeoutRef.current = setTimeout(() => {
          setIsParsing(false);
          setShowResult(PRESETS[index]!.result);
        }, 1200);
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

  // Dynamic Styles computed from our Sliders/Dials
  const dynamicBorderRadius = `${(12 - variance) * 1.5}px`;
  const dynamicPadding = `${(11 - visualDensity) * 2 + 8}px`;
  const dynamicGap = `${(11 - visualDensity) * 1.5 + 6}px`;
  const dynamicSpacing = `${(11 - visualDensity) * 2 + 10}px`;
  const dynamicSkew = `${(variance - 4) * 0.4}deg`;
  const dynamicRotate = `${(variance - 4) * 0.3}deg`;

  // Motion physics configuration based on Motion Intensity dial
  const dynamicSpring = {
    type: "spring",
    stiffness: motionIntensity * 25 + 30,
    damping: 16 - (motionIntensity - 6) * 0.8,
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 overflow-x-hidden">
      
      {/* Animated Aurora Rays Background */}
      <div className="absolute inset-0 z-0 h-[80vh] w-full pointer-events-none opacity-40">
        <AnimatedRays className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/70 to-zinc-950" />
      </div>

      {/* Grid Pattern overlay for depth */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, #818cf8 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      <header className="relative z-10 flex items-center justify-between border-b border-zinc-900/80 px-6 py-4 backdrop-blur-md bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 shadow-md shadow-indigo-500/25">
            <Sparkle size={14} weight="fill" className="text-zinc-950 animate-pulse" />
          </div>
          <span className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
            Noctra
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-zinc-100 to-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 transition-all hover:brightness-110 shadow-md shadow-zinc-100/10"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Side: Hero Text & Call to Action */}
        <div className="lg:col-span-5 flex flex-col gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium text-indigo-300 w-fit"
          >
            <Sparkle size={12} weight="fill" />
            <span>AI Command Center for Google Workspace</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-500 leading-tight"
          >
            Your inbox, <br />
            ruled by your words.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-zinc-400 text-lg leading-relaxed max-w-lg"
          >
            Manage Gmail & Google Calendar using natural language. Send, draft, and schedule multi-step actions in one swift sentence.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-2"
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-6 py-3.5 text-base font-semibold text-zinc-950 transition-all hover:bg-zinc-200 shadow-lg shadow-zinc-100/10 group"
            >
              <span>Start Commanding</span>
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#sandbox"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900/60 border border-zinc-800 px-6 py-3.5 text-base font-semibold text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Play with Demo
            </a>
          </motion.div>
        </div>

        {/* Right Side: Interactive Command Terminal & Sandbox */}
        <div className="lg:col-span-7 flex flex-col gap-6" id="sandbox">
          
          {/* Design Engine Dials Panel */}
          <div className="border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-md rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest">
              <Sliders size={14} />
              <span>Design Engine Dials (Live Spacing & Skew)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Variance Dial */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Design Variance</span>
                  <span className="text-indigo-400">{variance}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={variance} 
                  onChange={(e) => setVariance(Number(e.target.value))}
                  className="h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <span className="text-[10px] text-zinc-500 font-mono">1 = Flat, 10 = Skewed/Brutalist</span>
              </div>

              {/* Motion Intensity Dial */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Motion Intensity</span>
                  <span className="text-indigo-400">{motionIntensity}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={motionIntensity} 
                  onChange={(e) => setMotionIntensity(Number(e.target.value))}
                  className="h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <span className="text-[10px] text-zinc-500 font-mono">1 = Static, 10 = Spring Physics</span>
              </div>

              {/* Visual Density Dial */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Visual Density</span>
                  <span className="text-indigo-400">{visualDensity}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={visualDensity} 
                  onChange={(e) => setVisualDensity(Number(e.target.value))}
                  className="h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <span className="text-[10px] text-zinc-500 font-mono">1 = Airy grid, 10 = Dense cockpit</span>
              </div>
            </div>
          </div>

          {/* Interactive Preview Container */}
          <motion.div 
            layout
            style={{ 
              borderRadius: dynamicBorderRadius,
              transform: `rotate(${dynamicRotate}) skewX(${dynamicSkew})`,
              transformOrigin: "center top",
            }}
            transition={dynamicSpring}
            className="relative border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 overflow-hidden flex flex-col w-full"
          >
            {/* Header window control */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/40">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-zinc-800" />
                <span className="h-3 w-3 rounded-full bg-zinc-800" />
                <span className="h-3 w-3 rounded-full bg-zinc-800" />
                <span className="ml-2 text-xs font-mono text-zinc-500">interactive-demo.sh</span>
              </div>
              <div className="flex items-center gap-2">
                {(inputText || showResult) && (
                  <button 
                    onClick={resetSandbox} 
                    className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <ArrowClockwise size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sandbox Console Input */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/20">
              <div className="flex items-center gap-3 bg-zinc-950/60 rounded-lg border border-zinc-800 px-3 py-2.5">
                <span className="text-xs font-mono text-zinc-600 select-none">CMD</span>
                <input 
                  type="text" 
                  value={inputText}
                  readOnly
                  placeholder="Click a preset to type a command..."
                  className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-0"
                />
                <div className="flex items-center gap-2">
                  {isParsing && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>Parsing...</span>
                    </div>
                  )}
                  {showResult && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                      <Check size={14} />
                      <span>Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preset buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(idx)}
                    disabled={isTyping || isParsing}
                    className={`rounded px-3 py-1 text-xs font-mono transition-all border ${
                      activePreset === idx
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-sm"
                        : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Action Visuals Area */}
            <div 
              style={{ padding: dynamicPadding }}
              className="flex flex-col gap-4 min-h-[200px] bg-zinc-950/20"
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
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-600 mb-3">
                      <PaperPlaneTilt size={18} />
                    </div>
                    <span className="text-sm text-zinc-500 font-mono">No command loaded.</span>
                    <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                      Select one of the preset buttons above to see how AI extracts commands into clean visual payloads.
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
                    className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3"
                  >
                    <div className="relative h-8 w-8 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">Extracting semantic variables...</span>
                  </motion.div>
                )}

                {/* Show Result Details */}
                {showResult && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={dynamicSpring}
                    className="flex flex-col w-full h-full"
                    style={{ gap: dynamicGap }}
                  >
                    {/* Render Email Card */}
                    {showResult.type === "email_draft" && (
                      <div className="border border-zinc-800 bg-zinc-900/80 rounded-lg overflow-hidden w-full">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 bg-zinc-900/40 text-[10px] font-mono text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            <span>GMAIL DRAFT GENERATED</span>
                          </span>
                          <span className="bg-red-500/10 text-red-400 border border-red-500/10 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold">
                            {showResult.priority} priority
                          </span>
                        </div>
                        <div className="p-3.5 flex flex-col gap-2.5">
                          <div className="grid grid-cols-12 gap-1 border-b border-zinc-800/40 pb-2 text-xs">
                            <span className="col-span-2 text-zinc-500 font-mono">To:</span>
                            <span className="col-span-10 text-zinc-300 font-medium font-mono">{showResult.to}</span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 border-b border-zinc-800/40 pb-2 text-xs">
                            <span className="col-span-2 text-zinc-500 font-mono">Subject:</span>
                            <span className="col-span-10 text-zinc-200 font-semibold">{showResult.subject}</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1 font-mono leading-relaxed bg-zinc-950/40 p-2.5 rounded border border-zinc-900">
                            {showResult.body}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Render Calendar Card */}
                    {showResult.type === "calendar_invite" && (
                      <div className="border border-zinc-800 bg-zinc-900/80 rounded-lg overflow-hidden w-full">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 bg-zinc-900/40 text-[10px] font-mono text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <span>CALENDAR EVENT STAGED</span>
                          </span>
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Clock size={11} />
                            <span>1 hr duration</span>
                          </span>
                        </div>
                        <div className="p-3.5 flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <CalendarBlank size={20} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <div>
                              <div className="text-sm font-semibold text-zinc-200 truncate">{showResult.title}</div>
                              <div className="text-xs text-indigo-400 font-mono font-medium mt-0.5">{showResult.time}</div>
                            </div>
                            <div className="text-xs text-zinc-500 border-t border-zinc-800/30 pt-1.5">
                              {showResult.description}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {showResult.attendees.map((email: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-zinc-800/60 border border-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
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
                        {showResult.actions.map((act: ChainAction, i: number) => (
                          <div key={i} className="border border-zinc-800 bg-zinc-900/80 rounded-lg overflow-hidden w-full">
                            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 bg-zinc-900/40 text-[9px] font-mono text-zinc-500 uppercase">
                              <span>Flow Step {i + 1}: {act.type.replace("_", " ")}</span>
                            </div>
                            <div className="p-3 text-xs flex flex-col gap-1.5">
                              {act.type === "email_send" ? (
                                <>
                                  <div className="flex gap-2 font-mono"><span className="text-zinc-500">To:</span><span className="text-zinc-300 font-medium">{act.to}</span></div>
                                  <div className="flex gap-2 font-mono"><span className="text-zinc-500">Sub:</span><span className="text-zinc-200 font-semibold">{act.subject}</span></div>
                                  <div className="text-[11px] text-zinc-400 bg-zinc-950/20 p-2 rounded mt-1 font-mono">{act.body}</div>
                                </>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <CalendarBlank size={16} />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-zinc-200">{act.title}</div>
                                    <div className="text-[10px] text-indigo-400 font-mono">{act.time}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bento Grid Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-zinc-900">
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Designed for speed</h2>
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">The ultimate keyboard workflows</h3>
          <p className="text-zinc-500 text-sm">No complex dropdowns or calendar picking. Type, review, and confirm.</p>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-3 w-full"
          style={{ gap: dynamicSpacing }}
        >
          {/* Feature 1 */}
          <motion.div 
            style={{ borderRadius: dynamicBorderRadius }}
            className="border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col gap-4 text-left transition-all hover:bg-zinc-900/30 hover:border-zinc-800/80"
          >
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <EnvelopeSimple size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Semantic Email Engine</h4>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-mono">
                Noctra uses lightweight LLM agents to map natural sentences into Gmail headers and bodies. Draft, edit, and send without leaving the terminal page.
              </p>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            style={{ borderRadius: dynamicBorderRadius }}
            className="border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col gap-4 text-left transition-all hover:bg-zinc-900/30 hover:border-zinc-800/80"
          >
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CalendarBlank size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Smart Calendar Mapper</h4>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-mono">
                Understands context like &apos;next Thursday at 9am&apos; or &apos;tomorrow evening&apos;. Instantly stages calendar invites with attendee mapping.
              </p>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            style={{ borderRadius: dynamicBorderRadius }}
            className="border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col gap-4 text-left transition-all hover:bg-zinc-900/30 hover:border-zinc-800/80"
          >
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sliders size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-200">Design Variance Dials</h4>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-mono">
                Crafted with adaptive tokens allowing you to adjust visual density, design variance, and motion stiffness dynamically. Custom-tailored aesthetics in dark mode.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 py-12 px-6 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-600">
          <span>&copy; 2026 Noctra. Built for performance.</span>
          <div className="flex gap-4">
            <Link href="/signin" className="hover:text-zinc-400 transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-zinc-400 transition-colors">Sign Up</Link>
            <span className="text-zinc-800">|</span>
            <span className="text-indigo-500/70 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkle size={10} weight="fill" />
              <span>Premium Dark Design</span>
            </span>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
