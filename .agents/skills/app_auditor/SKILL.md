---
name: App Commercialization Auditor
description: Reviews the app's codebase, UI/UX, database schema, APIs, and overall SaaS-readiness to recommend changes that elevate the application to a high-quality commercial product.
---

# App Commercialization Auditor Skill

Use this skill when you need to inspect the project for:
1. **Best Practices**: Ensure clean, type-safe Next.js/Express/Drizzle/TypeScript code, solid security policies, clean error boundaries, and API rate-limiting.
2. **Core Functionality**: Analyze authentication flows (Better Auth), background data synchronization, real-time message caching, and LLM-powered command processing.
3. **Commercialization Checklist**: Recommend features and improvements to convert the project from a showcase app to a production-grade SaaS product, such as:
   - Stripe/billing integration.
   - Robust logging, telemetry, and error reporting.
   - Dynamic UI animations and micro-interactions.
   - Refined multi-tenancy and data isolation.

## Guidelines for Audits

1. Run an initial codebase scan of `src/app`, `src/server`, `src/components`, and `drizzle/` configurations.
2. Identify code quality issues, security vulnerabilities, or logical bugs in the data syncing and command processing loops.
3. Write a comprehensive report structured as an artifact at `C:\Users\abhin\.gemini\antigravity\brain\<conversation-id>\commercialization_audit.md` that highlights specific file paths, code blocks, and proposes clear remediation.
