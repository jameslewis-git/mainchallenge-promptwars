# 🧠 MindSpace — AI Wellness Companion for Exam Students

> **Google for Developers I/O · PromptWars · Mental Wellness Tracker Challenge**  
> An always-available conversational AI companion for students preparing for NEET, JEE, CUET, CAT, GATE, and UPSC.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-netlify-00D4AA?style=for-the-badge&logo=netlify)](https://your-app.netlify.app)
[![GitHub](https://img.shields.io/badge/GitHub-mainchallenge--promptwars-7B2FBE?style=for-the-badge&logo=github)](https://github.com/jameslewis-git/mainchallenge-promptwars)

---

## 🚀 Live Demo

**https://your-app.netlify.app**

---

## 💡 What It Does

MindSpace is a **conversational AI mental wellness companion** built specifically for Indian students navigating the extreme pressure of competitive exams. Unlike standard mood trackers, MindSpace engages in real multi-turn dialogue — remembering everything said in the session and responding as an empathetic senior who has been through the same pressure.

```
Student opens app
  → Selects exam type (NEET/JEE/CUET/CAT/GATE/UPSC/CET)
  → Rates current mood (1–10 with emoji labels)
  → Writes a free-form journal entry (no structure required)
  → AI companion responds empathetically with full context
  → Conversation continues — AI surfaces coping strategies,
    mindfulness timers, mood check-ins, stress triggers
    and motivational messages inline in the chat
```

---

## 🎯 Problem Statement Alignment

| Requirement | MindSpace Implementation |
|---|---|
| **Generative AI-powered** | Ollama Cloud (`gemma3:4b`) powers all responses via a secure server function — no client-side AI calls |
| **Monitor & improve mental well-being** | 10-point emoji mood meter on open + mid-session inline mood check-ins track emotional state throughout |
| **NEET, JEE, CUET, CAT, GATE, UPSC** | Exam type selector personalizes every AI response — the model references the specific exam in every reply |
| **Open-ended daily journaling** | Free-form textarea with rotating placeholders ("Today I felt…" / "The hardest part was…") — no structure forced |
| **Mood logs** | Mood captured at session start + inline re-check widgets triggered by AI every 3–4 turns; stored per-session |
| **Hidden stress triggers** | AI extracts `stressTriggers[]` from each message — rendered as tags below responses |
| **Emotional patterns** | Full conversation history sent on every request — AI detects patterns (e.g. escalating anxiety) across the session |
| **Conversational AI** | True multi-turn chat: full history context on every request, typing indicators, persistent multi-session sidebar |
| **Hyper-personalized support** | Exam type + mood rating + full history = unique context per student per session |
| **Real-time coping strategies** | `copingCards[]` rendered inline in chat when AI detects distress — horizontally scrollable cards with techniques |
| **Adaptive mindfulness exercises** | `mindfulnessExercise` + SVG countdown timer with step-by-step guide rendered directly in the conversation |
| **Motivational encouragement** | `motivationalMessage` field rendered as a styled quote block referencing the student's specific exam |
| **Empathetic digital companion** | System prompt tuned to "trusted senior" voice; hardcoded crisis detection + iCall/NIMHANS helplines |
| **Always available** | Graceful offline fallback — if AI is unreachable, pre-written empathetic responses maintain the companion experience |

---

## ⚖️ Judging Parameters

### ✅ Code Quality
- **TypeScript throughout** — full type safety via Zod schemas on all API inputs
- **TanStack Start server functions** — clean separation: UI components know nothing about the AI, the hook knows nothing about the transport, the server function knows nothing about React
- **Single responsibility**: `chat.server.ts` (AI logic), `useConversation.ts` (state), `mindspace-store.ts` (persistence), route components (UI only)
- **No external UI libraries** — built on Radix UI primitives + custom CSS for full control

### ✅ Security
- **Secrets never reach the browser** — API key and URL read inside a `.server.ts` handler (Nitro tree-shakes server code from client bundle)
- **Input sanitization** — HTML stripped from all user messages before they reach the AI model
- **Zod validation** — messages capped at 40/session, each message ≤ 2000 chars, mood validated 1–10, examType ≤ 40 chars
- **Crisis detection is hardcoded client-side** — never relies on AI for safety; keyword match triggers immediate crisis banner with iCall (9152987821) and NIMHANS (080-46110007)
- **Privacy by design** — conversation content never logged; only metadata (turn count, urgency level, mood) logged server-side
- **No database** — all session state in React memory, wiped on refresh; localStorage for session list only
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` via `netlify.toml`
- **Timeout** — `AbortSignal.timeout(28_000)` prevents serverless function from hanging

### ✅ Efficiency
- **Stateless server, stateful client** — server processes one request and returns; no server-side session management
- **Conversation history capped** — 40 turns max prevents unbounded context growth and controls inference cost
- **Tree-shaken bundles** — server code stripped from client bundle by Nitro; client payload is lean
- **Static asset caching** — `Cache-Control: public, max-age=31536000, immutable` for all `/assets/*`
- **Lazy rendering** — coping cards, timer, mood check-in only mount when AI response includes them
- **Local localStorage** — session list persists across page refreshes without a database round-trip

### ✅ Testing
| Test | Scenario | Expected |
|---|---|---|
| T1 | Onboarding gating | Load app, hit Begin without fields → button disabled |
| T2 | Session start | JEE + mood 3 + 20+ chars → chat opens, AI responds |
| T3 | Multi-turn memory | "I'm scared about Physics" → "What did I say?" → AI references Physics |
| T4 | Coping cards | "I'm extremely anxious" → coping cards render below reply |
| T5 | Mindfulness timer | "Guide me through breathing" → timer widget appears and works |
| T6 | Mood check-in | After 3–4 messages → AI triggers inline mood re-selector |
| T7 | Crisis keyword | Type "I want to end it all" → red crisis banner appears immediately |
| T8 | Offline fallback | Network offline → send message → fallback reply, no crash |
| T9 | Keyboard nav | Tab through all controls, Enter to send, Escape to clear |
| T10 | Mobile responsive | 375px viewport → chat fills screen, input anchored to bottom |

### ✅ Accessibility (WCAG 2.1 AA)
| Requirement | Implementation |
|---|---|
| Color contrast ≥ 4.5:1 | White `#FFF` on `#1A0A2E` = 14.2:1 |
| Non-color indicators | Mood uses emoji + label text, not color alone |
| Keyboard navigation | Full tab flow; Enter sends, Esc clears |
| Screen reader labels | `aria-label` on send button, mood buttons, AI bubbles |
| Semantic roles | `role="radiogroup"` on mood, `role="log"` on chat thread |
| Focus indicators | 2px solid teal `#00D4AA` ring on all focusable elements |
| Reduced motion | All animations wrapped in `@media (prefers-reduced-motion: reduce)` |
| Live regions | Chat thread: `aria-live="polite"` for new messages |
| Crisis banner | `role="alert"` + `aria-live="assertive"` for immediate announcement |
| Timer | `aria-live="polite"` announces remaining time |

### ✅ Problem Statement Alignment
Every requirement from the problem brief maps directly to a shipped feature (see table above). MindSpace satisfies all stated requirements including the two most critical: **conversational AI** (full multi-turn chat, not a one-shot form) and **always-available companion** (graceful offline fallback + hardcoded crisis safety net).

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 19 + TanStack Router | File-based routing, type-safe params, fast HMR |
| **SSR** | TanStack Start + Nitro | Server functions run securely server-side; secrets never reach browser |
| **Styling** | Tailwind CSS 4 + Vanilla CSS | Design system tokens + custom animations, glassmorphism |
| **AI Backend** | Ollama Cloud (`gemma3:4b`) | Fast, hosted, no GPU needed; responds in ~3s |
| **State** | React hooks + localStorage | No database; ephemeral by design for privacy |
| **Deployment** | Netlify (Nitro netlify preset) | CD from GitHub, edge network, built-in secrets management |

---

## 🔌 Architecture

```
Browser (React)
  │
  ├── useConversation.ts     # All session state (messages, mood, examType)
  │     │
  │     └── sendChatMessage()  # TanStack Start server function (RPC)
  │           │
  │           └── chat.server.ts  # Runs server-side only
  │                 ├── Zod validation + HTML sanitization
  │                 ├── System prompt builder (exam + mood injected)
  │                 ├── Ollama Cloud API call (gemma3:4b)
  │                 └── Graceful fallback on error
  │
  ├── mindspace-store.ts     # localStorage thread persistence
  │
  └── chat.$threadId.tsx     # Full chat UI (onboarding + chat view)
        ├── Onboarding (exam picker, mood meter, journal)
        ├── ChatView (bubbles, coping cards, timer, mood check-in)
        └── Crisis banner (hardcoded keyword detection)
```

**Key design principle:** Stateless server, stateful client. The full conversation history is sent on every request — giving the AI complete context while keeping the server simple and free of session state.

---

## 🔒 Privacy

Journal entries and chat messages are **never stored on any server**. All processing is ephemeral:
- Session content lives in React state only (wiped on tab close)
- localStorage holds only thread metadata (title, exam type, message count) — not message content
- Server logs only: `turns=N urgency=low mood=7` — never message text

---

## ⚠️ Safety

MindSpace is a wellness support tool, not a substitute for professional mental health care.

**Crisis keywords detected client-side** (before any AI call):  
`self harm`, `suicide`, `end it`, `can't go on`, `kill myself`

On detection, a persistent red banner appears with:
- **iCall:** 9152987821 (Mon–Sat, 8am–10pm)  
- **NIMHANS:** 080-46110007 (24/7)

---

## 🚀 Local Setup

```bash
git clone https://github.com/jameslewis-git/mainchallenge-promptwars.git
cd mainchallenge-promptwars

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Ollama Cloud credentials

# Run dev server
npm run dev   # → http://localhost:3000
```

**Required environment variables** (add to `.env.local` locally, Netlify dashboard for production):
```env
OLLAMA_API_URL=https://ollama.com
OLLAMA_API_KEY=your_key_here
OLLAMA_MODEL=gemma3:4b
```
