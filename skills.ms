# UI/UX, Animation, and Frontend Agent Skills

This file contains the configuration, installation references, and instructions for the leading Design, UI/UX, Frontend, and Animation skills from [skills.sh](https://skills.sh/).

---

## 1. frontend-design (anthropics/skills)
**Description**: Create distinctive, production-grade frontend interfaces with high design quality. Prevents default LLM biases and generic AI aesthetics.
- **Repository**: `https://github.com/anthropics/skills`
- **Installation CLI**: `npx skills add anthropics/skills --skill frontend-design`
- **Claude Code Plugin**: `/plugin install frontend-design@claude-plugins-official`

### Core Design Thinking & Guidelines
- **Commit to a Bold Aesthetic**: Choose a clear conceptual direction (e.g., brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, industrial/utilitarian) before coding.
- **Avoid Default LLM Tells**: Avoid default system fonts (Inter, Roboto), clichéd purple/indigo gradients, and standard three-equal-feature-card layouts.
- **Focus Areas**: Prioritize typography, custom color variables, motion/interaction feedback, and precise spatial composition.

---

## 2. design-taste-frontend (leonxlnx/taste-skill)
**Description**: Senior UI/UX Engineer skill. Overrides default LLM biases. Enforces metric-based rules, component architecture, and CSS hardware acceleration.
- **Repository**: `https://github.com/leonxlnx/taste-skill`
- **Installation CLI**: `npx skills add https://github.com/leonxlnx/taste-skill --skill design-taste-frontend`

### Core Guidelines
- **Configure Core Dials**:
  - `DESIGN_VARIANCE`: 8 (scale 1-10, where 10 is artsy/asymmetrical chaos)
  - `MOTION_INTENSITY`: 6 (scale 1-10, where 10 is cinematic/magic physics)
  - `VISUAL_DENSITY`: 4 (scale 1-10, where 10 is information-dense/cockpit layout)
- **Strict Anti-patterns**: Bans em-dashes, generic serif fonts, beige+brass "premium" palettes, three-equal-feature-cards, and hallucinated copywriting.
- **Verification Checklist**: Enforces a pre-flight checklist covering visual contrast, button text-wrapping, hero section fold fit, color consistency, and motion justification.

---

## 3. ui-ux-pro-max (nextlevelbuilder/ui-ux-pro-max-skill)
**Description**: UI/UX design intelligence database across 10 technology stacks. Includes 50+ styles, 161 color palettes, 57 font pairings, and 99 UX guidelines.
- **Repository**: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- **Installation CLI**: `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max`

### Core Guidelines
- **Application Triggers**: Apply when building UI layouts, deciding state behaviors, or reviewing UX consistency.
- **Components & Patterns**: Contains optimization rules for buttons, modals, cards, forms, tables, and charts.
- **Design Systems**: Recommends color schemes, typography, and effects mapped specifically to the product type (SaaS, portfolio, mobile app, etc.) and selected tech stack.

---

## 4. web-design-guidelines (vercel-labs/agent-skills)
**Description**: Review UI code for Web Interface Guidelines compliance, covering spacing, typography, interaction, and accessibility.
- **Repository**: `https://github.com/vercel-labs/agent-skills`
- **Installation CLI**: `npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines`
- **Guidelines Source**: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

### Core Guidelines
- **Auditing Flow**: Read specified files and compare against rules fetched from Vercel's Web Interface Guidelines.
- **Output Format**: Terse `file:line` syntax highlighting specific accessibility, spacing, or visual violations.

---

## 5. remotion-best-practices (remotion-dev/skills)
**Description**: Domain-specific knowledge base for building web-based videos and programmatic animations using Remotion and React.
- **Repository**: `https://github.com/remotion-dev/skills`
- **Installation CLI**: `npx skills add https://github.com/remotion-dev/skills --skill remotion-best-practices`

### Core Guidelines
- **Video Animations**: Animate React properties using `useCurrentFrame()` and `interpolate()` coupled with `Easing` functions to customize timing.
- **Composition Controls**: Structure parametrizable compositions and calculate dynamic metadata.
- **Assets & Media**: Integrate audio visualizations, custom captions, sound effects, Lottie animations, Mapbox maps, and AI-generated voiceovers.

---

## 6. color-palette-generator (nextlevelbuilder/ui-ux-pro-max-skill)
**Description**: AI-driven color matching skill providing custom palettes tailored to specific contexts (e.g. premium dark mode, SaaS minimalist, high contrast accessible).
- **Repository**: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- **Installation CLI**: `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill color-palette-generator`

### Core Guidelines for Premium Dark Modes
- **Avoid Pure Black Backgrounds**: Use rich, tinted dark tones (e.g., `#030303`, `#05050e`, or deep indigo-slate `#090916`) to retain depth and prevent visual fatigue.
- **Surface Elevation Scaling**: Use semi-transparent layers (`rgba(255, 255, 255, 0.03)`) or progressively lighter slate fills (`#0f0f1c`, `#17172b`) to represent height and physical layering.
- **Saturated Accent Highlights**: Use vibrant, high-luminous accents (cyan, neon indigo, neon violet, emerald) sparingly to draw user focus. Make sure contrast ratios satisfy WCAG AA (at least 4.5:1).
- **Gradient Transitioning**: Ensure background colors merge cleanly into the primary dark tone without harsh color boundary clipping.

---

## 7. typography-and-font-pairing (vercel-labs/agent-skills)
**Description**: Best practices for font pairings, typographic hierarchy, and semantic text scaling on responsive web apps.
- **Repository**: `https://github.com/vercel-labs/agent-skills`
- **Installation CLI**: `npx skills add https://github.com/vercel-labs/agent-skills --skill typography-and-font-pairing`

### Core Typographic Guidelines
- **Pairing Contrast**: Pair a highly geometric, modern sans-serif header font (like Plus Jakarta Sans, Outfit, or Syne) with a highly readable, clean body font (like Inter or system defaults).
- **Monospace Intentionality**: Use monospace fonts (like JetBrains Mono or Fira Code) exclusively for structural parameters, labels, code examples, console commands, or keyboard shortcuts to signal interactivity.
- **Modular Scaling**: Enforce strict font scale policies:
  - Hero Header: `3rem` (48px) to `4.5rem` (72px), extra bold.
  - Section Header: `2rem` (32px) to `2.5rem` (40px), bold.
  - Body Text: `0.875rem` (14px) to `1rem` (16px), regular/medium.
  - Micro-metadata/Console: `0.75rem` (12px), semibold/mono.
- **Line-Height & Tracking**: Set larger line-height for body copy (`1.6` to `1.75`) and tighter tracking (`letter-spacing: -0.025em`) for larger headers to improve readability.
