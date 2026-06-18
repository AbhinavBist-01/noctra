<div align="center">
  <img src="/noctra_logo.png" alt="Noctra Logo" width="380" style="margin-bottom: 20px;" />
  <p align="center">
    <strong>Your workspace, ruled by your words.</strong><br />
    An AI-powered, naturally commandable, nocturnal bat-themed email & calendar client dashboard.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Express.js-5-yellow?style=for-the-badge&logo=express" alt="Express" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Drizzle_ORM-0.41-green?style=for-the-badge&logo=drizzle" alt="Drizzle" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </p>
</div>

---

## 🌙 About Noctra

**Noctra** is a state-of-the-art interactive workspace designed for speed and styled for the night. Combining the power of LLMs with Google API integrations, it allows users to manage their **Gmail inbox** and **Google Calendar** using simple, natural language commands. Send emails, save drafts, and schedule multi-step calendar events in one swift sentence.

---

## 🌟 Core Features

*   **🎙️ AI Agent Command Bar**: Parse semantic natural language inputs into structured API execution payloads. Supports chained instructions (e.g., *"Send follow-up to client@corp.com. Invite them to sync meeting this Friday at 10 AM"*).
*   **📬 Real-Time Gmail Cache**: Auto-syncs your Inbox in the background, caching messages, threads, and drafts locally for instant loading and offline queryability.
*   **📅 Dynamic Calendar Agenda**: Interactive calendar interface showing today's events, meeting agendas, and inline scheduling.
*   **🤖 Smart Reply Assistant**: Instantly generate AI-powered response suggestions (e.g. *Acknowledge*, *Decline*, *Need More Time*) inside email threads.
*   **📊 Bento Pipeline Monitor**: A premium features grid displaying live node-graph execution pipelines, token monitors, live activity logs, and tool latency metrics.
*   **🎨 Premium Dark Aesthetics**: Custom backlit bat-winged branding, morphing taglines, and glassmorphic UI panels with amber-glowing borders.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | React 19, Next.js 15 (App Router) | Client application and static/dynamic rendering. |
| **Backend Core** | Express.js 5, Node.js | Webhook receivers, background jobs, API proxy. |
| **Styling & Motion** | Tailwind CSS, Framer Motion | Dark-glass themes and spring-physics animations. |
| **Database & ORM** | PostgreSQL, Drizzle ORM | Relational tables for sessions, accounts, messages. |
| **Authentication** | Better Auth | Google OAuth provider & session cookie management. |
| **APIs & SDKs** | Corsair SDK, Gmail API, Calendar API | Secure connection adapters for Google Workspace. |
| **AI Processing** | OpenAI API (GPT Models) | Semantic command parsing & smart email summaries. |

---

## 📐 System Architecture

Noctra uses a synchronized **client-server architecture** backed by local database caching to bypass third-party API latency and request overheads.

```mermaid
graph TD
  User([User Browser]) -->|Reads/Writes| NextJS[Next.js Frontend]
  NextJS -->|Proxies Requests| Express[Express Server]
  Express -->|Read/Write Session| PG[(Postgres DB)]
  Express -->|Sync Cache| PG
  Express -->|OAuth / Tokens| BetterAuth[Better Auth]
  Express -->|Google API Calls| Corsair[Corsair SDK]
  Corsair -->|Fetch/Modify| Google[Gmail & Calendar APIs]
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   pnpm (v9 or higher)
*   PostgreSQL database instance running locally or hosted

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/noctra.git
cd noctra
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and specify the following keys:
```env
# Server Configurations
EXPRESS_PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/noctra"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Better Auth OAuth Configuration
BETTER_AUTH_SECRET="your_better_auth_secret"
BETTER_AUTH_GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
BETTER_AUTH_GOOGLE_CLIENT_SECRET="your_google_client_secret"

# OpenAI Configuration
OPENAI_API_KEY="sk-proj-your_openai_key"

# Corsair SDK tenant ID
CORSAIR_TENANT_ID="dev"
```

### 3. Push Database Schema
Ensure Postgres is running and push Drizzle schemas to create your tables:
```bash
pnpm run db:push
```

### 4. Start Development Servers
Run Next.js and the Express backend concurrently in development mode:
```bash
pnpm run dev:all
```
Your Next.js app will be active on [http://localhost:3000](http://localhost:3000) and the Express server will proxy requests on [http://localhost:4000](http://localhost:4000).

---

## 🔑 Google Cloud Consent Setup

For Gmail and Calendar integrations to communicate with Google, configure your **OAuth Consent Screen** in the [Google Cloud Console](https://console.cloud.google.com/):

1.  **Authorize Scopes**:
    Add the following scopes to your OAuth Consent screen configurations:
    *   `https://www.googleapis.com/auth/gmail.readonly`
    *   `https://www.googleapis.com/auth/gmail.modify`
    *   `https://www.googleapis.com/auth/gmail.send`
    *   `https://www.googleapis.com/auth/gmail.compose`
    *   `https://www.googleapis.com/auth/calendar`
    *   `https://www.googleapis.com/auth/calendar.events`
2.  **Add Test Users**:
    Add your test Google email addresses under the **Test users** section on the OAuth consent settings page.
3.  **App Consent**:
    Make sure to check all Gmail and Calendar permission checkboxes during sign-in to grant the local server access tokens.

---

## 📦 Production Builds

To package and compile the project for production, run:
```bash
pnpm run build
pnpm run start
```
This cleans the compilation cache, bundles server and client assets, and optimizes route pre-rendering.
