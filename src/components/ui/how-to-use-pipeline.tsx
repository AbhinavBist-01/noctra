"use client";

import { motion } from "framer-motion";
import { ShieldCheck, TerminalWindow, RocketLaunch } from "@phosphor-icons/react";

const steps = [
  {
    step: "01",
    title: "Connect Workspace",
    icon: <ShieldCheck size={20} weight="duotone" className="text-amber-400" />,
    line1: "Link your Google account securely using OAuth 2.0.",
    line2: "Permissions remain strictly scoped to your explicit commands.",
  },
  {
    step: "02",
    title: "Type Directives",
    icon: <TerminalWindow size={20} weight="duotone" className="text-amber-400" />,
    line1: "Type instructions naturally in plain English.",
    line2: "Noctra instantly drafts emails and schedules calendar invites.",
  },
  {
    step: "03",
    title: "Review & Execute",
    icon: <RocketLaunch size={20} weight="duotone" className="text-amber-400" />,
    line1: "Inspect extracted parameters on the visual command desk.",
    line2: "Confirm execution with a single keyboard shortcut.",
  },
];

export function HowToUsePipeline() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.04]" id="how-to-use">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
        <h2 className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">
          Interactive Workflow
        </h2>
        <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-zinc-100">
          How to Use Noctra
        </h3>
        <p className="text-zinc-500 text-sm font-mono">
          Three simple steps to automate your daily Workspace tasks.
        </p>
      </div>

      {/* Grid Container with Dotted Animated Pipeline */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Desktop Dotted SVG Pipeline Connector */}
        <div className="hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-8 pointer-events-none z-0">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pipeline-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Dotted Line Path */}
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="url(#pipeline-grad)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          </svg>

          {/* Animated Light Pulses along pipeline */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]"
            animate={{
              left: ["0%", "100%"],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Step Cards */}
        {steps.map((s, idx) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.15, duration: 0.5 }}
            className="group relative z-10 rounded-2xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-md p-7 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1"
          >
            {/* Anchor Node Dot */}
            <div className="hidden md:block absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-900 border-2 border-amber-500/40 group-hover:border-amber-400 group-hover:scale-125 transition-all duration-300" />

            <div className="space-y-4">
              {/* Header Row: Icon & Step Number */}
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  {s.icon}
                </div>
                <span className="text-xs font-mono font-bold text-amber-500/60 group-hover:text-amber-400 transition-colors">
                  STEP {s.step}
                </span>
              </div>

              {/* Step Title */}
              <h4 className="text-base font-bold text-zinc-100 font-display group-hover:text-amber-300 transition-colors">
                {s.title}
              </h4>

              {/* Strict 2-line Description */}
              <div className="text-xs text-zinc-400 leading-relaxed font-mono space-y-1">
                <p>{s.line1}</p>
                <p>{s.line2}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
