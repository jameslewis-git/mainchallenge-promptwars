import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Particles } from "@/components/mindspace/Particles";
import { emojiBurst } from "@/lib/emoji-burst";
import { useConversation, useThreadList } from "@/hooks/useConversation";
import {
  type AIData,
  type Message,
  createThread,
  upsertThread,
} from "@/lib/mindspace-store";
import { isAuthenticated, getUser, logout } from "@/lib/auth-store";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatPage,
});

const EXAMS = ["NEET", "JEE", "CUET", "CAT", "GATE", "UPSC", "CET", "Other"];

const MOODS = [
  { v: 1, e: "😣", label: "Crushed" },
  { v: 2, e: "😞", label: "Awful" },
  { v: 3, e: "😟", label: "Bad" },
  { v: 4, e: "😔", label: "Low" },
  { v: 5, e: "😐", label: "Okay" },
  { v: 6, e: "🙂", label: "Alright" },
  { v: 7, e: "😊", label: "Good" },
  { v: 8, e: "😄", label: "Great" },
  { v: 9, e: "🤩", label: "Amazing" },
  { v: 10, e: "💪", label: "Unstoppable" },
] as const;

const CRISIS_KEYWORDS = ["self harm", "self-harm", "suicide", "end it", "can't go on", "cant go on", "kill myself"];

const tintFor = (v: number | null) => {
  if (v == null) return "#A8B2C8";
  if (v <= 3) return "#FF4D6D";
  if (v <= 6) return "#F5C451";
  return "#00D4AA";
};

const PLACEHOLDERS = [
  "Today I felt...",
  "The hardest part was...",
  "I've been worried about...",
];

function ChatPage() {
  const { threadId } = useParams({ from: "/chat/$threadId" });
  // Key all state by threadId — remount via key prop on inner component.
  return (
    <div className="relative min-h-dvh w-full">
      <Particles />
      <ChatPageInner key={threadId} threadId={threadId} />
    </div>
  );
}

function ChatPageInner({ threadId }: { threadId: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  const conv = useConversation(threadId);
  const { threads, remove } = useThreadList();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNew = () => {
    const t = createThread();
    upsertThread(t);
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    setSidebarOpen(false);
  };

  const handleSelect = (id: string) => {
    navigate({ to: "/chat/$threadId", params: { threadId: id } });
    setSidebarOpen(false);
  };

  const handleDelete = (id: string) => {
    remove(id);
    if (id === threadId) {
      // navigate to remaining or new
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining[0]) navigate({ to: "/chat/$threadId", params: { threadId: remaining[0].id } });
      else handleNew();
    }
  };

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar
        threads={threads}
        activeId={threadId}
        onNew={handleNew}
        onSelect={handleSelect}
        onDelete={handleDelete}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <main className="flex min-h-dvh w-full flex-1 flex-col">
        {conv.sessionStarted ? (
          <ChatView conv={conv} onNewSession={handleNew} onOpenSidebar={() => setSidebarOpen(true)} />
        ) : (
          <Onboarding conv={conv} onOpenSidebar={() => setSidebarOpen(true)} />
        )}
      </main>
    </div>
  );
}

/* ────────── SIDEBAR ────────── */

function Sidebar({
  threads,
  activeId,
  onNew,
  onSelect,
  onDelete,
  open,
  setOpen,
}: {
  threads: ReturnType<typeof useThreadList>["threads"];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <>
      {/* overlay on mobile */}
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col p-4 transition-transform glass-strong md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="font-display text-lg font-bold gradient-text hover:opacity-85 transition-opacity flex items-center gap-1.5"
          >
            <span>🧠</span> MindSpace
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-white/60 hover:text-white md:hidden"
          >
            ✕
          </button>
        </div>

        <Link
          to="/dashboard"
          className="mb-3 w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-[#A8B2C8] border border-white/10 hover:border-white/20 hover:bg-white/5 hover:text-white transition-all"
        >
          📊 Dashboard
        </Link>

        <button
          onClick={onNew}
          className="mb-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg gradient-btn shrink-0"
          style={{ boxShadow: "0 8px 24px -8px rgba(123,47,190,0.6)" }}
        >
          + New session
        </button>
        <div className="mb-2 text-xs uppercase tracking-wider shrink-0" style={{ color: "#5A6478" }}>
          Sessions
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
          {threads.length === 0 && (
            <div className="text-sm" style={{ color: "#5A6478" }}>
              No sessions yet.
            </div>
          )}
          {threads.map((t) => {
            const active = t.id === activeId;
            return (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-lg p-2 transition-colors ${
                  active ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <button
                  onClick={() => onSelect(t.id)}
                  className="flex-1 truncate text-left text-sm"
                  style={{ color: active ? "#fff" : "#A8B2C8" }}
                  title={t.title}
                >
                  <div className="truncate font-medium">{t.title || "New session"}</div>
                  <div className="truncate text-xs" style={{ color: "#5A6478" }}>
                    {t.examType ?? "—"} · {t.messages.length} msgs
                  </div>
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label="Delete session"
                  className="rounded-md p-1.5 text-white/40 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>

        {/* Profile Card and Sign out at bottom */}
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg,#7B2FBE,#00D4AA)", color: "#fff" }}
            >
              {user?.avatar ?? "A"}
            </div>
            <span className="text-xs truncate font-medium text-white/80" style={{ color: "#A8B2C8" }}>
              {user?.name ?? "User"}
            </span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login", replace: true });
            }}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold transition-all hover:bg-white/5 shrink-0"
            style={{ color: "#FF8597" }}
          >
            Sign out
          </button>
        </div>

        <div className="mt-2 text-[10px] leading-relaxed shrink-0" style={{ color: "#5A6478" }}>
          Stored only in this browser. Not a substitute for professional help.
        </div>
      </aside>
    </>
  );
}

/* ────────── ONBOARDING ────────── */

function Onboarding({ conv, onOpenSidebar }: { conv: ReturnType<typeof useConversation>; onOpenSidebar: () => void }) {
  const [exam, setExam] = useState<string | null>(conv.examType);
  const [mood, setMood] = useState<number | null>(conv.mood);
  const [journal, setJournal] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const charCount = journal.length;
  const charValid = charCount >= 10 && charCount <= 2000;
  const ready = exam && mood && charValid && !conv.isLoading;

  const submit = async () => {
    if (!ready) return;
    await conv.startSession({ initialJournal: journal, selectedMood: mood!, selectedExam: exam! });
  };

  const moodObj = MOODS.find((m) => m.v === mood);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 md:px-8 md:py-12">
      <header className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <div className="font-mono-tech text-[11px] uppercase tracking-[0.3em]" style={{ color: "#00D4AA" }}>
            // INIT_SESSION
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            <span className="gradient-text neon-text">MINDSPACE</span>
            <span className="ml-2 font-mono-tech text-base" style={{ color: "#5A6478" }}>{"</>"}</span>
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: "#A8B2C8" }}>
            Your calm in the chaos of exam prep
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium animate-pulse-glow"
            style={{
              background: "rgba(0,212,170,0.12)",
              border: "1px solid rgba(0,212,170,0.4)",
              color: "#00D4AA",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00D4AA" }} />
            Powered by AI
          </span>
          <button
            onClick={onOpenSidebar}
            className="rounded-md px-3 py-1.5 text-xs md:hidden"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            ☰ Sessions
          </button>
        </div>
      </header>

      {/* Exam selector */}
      <section
        className="glass mt-8 p-6 animate-fade-up"
        style={{ animationDelay: "100ms" }}
        aria-labelledby="exam-label"
      >
        <label id="exam-label" className="font-display text-base font-semibold">
          Which exam are you preparing for?
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMS.map((x) => {
            const active = exam === x;
            return (
              <button
                key={x}
                onClick={() => setExam(x)}
                aria-pressed={active}
                className="rounded-full px-4 py-1.5 text-sm transition-all"
                style={{
                  background: active ? "linear-gradient(90deg,#7B2FBE,#00D4AA)" : "rgba(255,255,255,0.05)",
                  border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                  color: active ? "#fff" : "#A8B2C8",
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? "0 6px 18px -6px rgba(123,47,190,0.6)" : "none",
                }}
              >
                {x}
              </button>
            );
          })}
        </div>
      </section>

      {/* Mood meter */}
      <section
        className="glass mt-4 p-6 animate-fade-up"
        style={{ animationDelay: "200ms" }}
        aria-labelledby="mood-label"
      >
        <label id="mood-label" className="font-display text-base font-semibold">
          How are you feeling right now? (tap one)
        </label>
        <div role="radiogroup" aria-label="Mood selector" className="mt-4 flex flex-wrap justify-between gap-2">
          {MOODS.map((m) => {
            const active = mood === m.v;
            const c = tintFor(m.v);
            return (
              <button
                key={m.v}
                role="radio"
                aria-checked={active}
                aria-label={`Mood ${m.v}, ${m.label}`}
                onClick={(e) => {
                  setMood(m.v);
                  emojiBurst(m.e, e.clientX, e.clientY, 8);
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-transform ${
                  active ? "animate-spring" : "hover:scale-110"
                }`}
                style={{
                  background: active ? `${c}33` : "rgba(255,255,255,0.04)",
                  border: active ? `2px solid ${c}` : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: active ? `0 0 18px ${c}88` : "none",
                }}
              >
                <span aria-hidden>{m.e}</span>
              </button>
            );
          })}
        </div>
        {moodObj && (
          <div className="mt-4 text-center text-lg font-medium" style={{ color: tintFor(mood) }}>
            {moodObj.label} · {mood}/10
          </div>
        )}
      </section>

      {/* Journal */}
      <section
        className="glass mt-4 p-6 animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <label htmlFor="journal" className="font-display text-base font-semibold">
          What's been on your mind? Start anywhere…
        </label>
        <div className="relative mt-3">
          <textarea
            id="journal"
            value={journal}
            onChange={(e) => setJournal(e.target.value.slice(0, 2000))}
            rows={5}
            aria-label="Opening journal entry"
            className="w-full resize-none p-4 text-sm leading-relaxed text-white placeholder:text-transparent"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              outline: "none",
              minHeight: 120,
            }}
          />
          {journal.length === 0 && (
            <div aria-hidden className="pointer-events-none absolute left-4 top-4 text-sm" style={{ color: "#5A6478" }}>
              {PLACEHOLDERS[placeholderIdx]}
            </div>
          )}
          <div
            className="absolute bottom-2 right-3 text-xs"
            style={{ color: charValid ? "#00D4AA" : "#5A6478" }}
            aria-live="polite"
          >
            {charCount} / 2000 {charCount < 10 && "· min 10"}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!ready}
          aria-label="Begin your session"
          className="relative mt-4 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 font-semibold text-white transition-all disabled:opacity-50 gradient-btn"
          style={{
            boxShadow: ready ? "0 0 24px rgba(123,47,190,0.5)" : "none",
          }}
        >
          {conv.isLoading ? (
            <>
              <span
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmerSweep 1.2s linear infinite",
                }}
              />
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
              <span className="relative">Starting…</span>
            </>
          ) : (
            <>Begin your session →</>
          )}
        </button>
      </section>
    </div>
  );
}

/* ────────── CHAT VIEW ────────── */

function ChatView({
  conv,
  onNewSession,
  onOpenSidebar,
}: {
  conv: ReturnType<typeof useConversation>;
  onNewSession: () => void;
  onOpenSidebar: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [showCrisis, setShowCrisis] = useState(false);
  

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conv.messages.length, conv.isLoading]);

  // Focus input on mount + after assistant responses.
  useEffect(() => {
    inputRef.current?.focus();
  }, [conv.isLoading]);

  const detectCrisis = (text: string) =>
    CRISIS_KEYWORDS.some((k) => text.toLowerCase().includes(k));

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || conv.isLoading) return;
    if (detectCrisis(trimmed)) {
      setShowCrisis(true);
    }
    setDraft("");
    await conv.sendMessage(trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      setDraft("");
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col">
      {/* Header */}
      <header
        className="scanline sticky top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 glass-strong"
        style={{ borderBottom: "1px solid rgba(0,212,170,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            aria-label="Open sessions"
            className="rounded-md p-2 text-white/80 hover:bg-white/10 md:hidden"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-xs" style={{ color: "#00D4AA" }}>{"//"}</span>
            <div className="font-display text-base font-bold gradient-text neon-text">MINDSPACE</div>
            <span className="font-mono-tech text-[10px]" style={{ color: "#5A6478" }}>v1.0</span>
          </div>
          {conv.examType && (
            <span
              className="rounded-md px-2 py-0.5 font-mono-tech text-[11px] uppercase tracking-wider"
              style={{
                background: "rgba(123,47,190,0.18)",
                border: "1px solid rgba(123,47,190,0.5)",
                color: "#C9A6FF",
              }}
            >
              [{conv.examType}_MODE]
            </span>
          )}
        </div>
        <div className="hidden items-center gap-2 font-mono-tech text-xs sm:flex">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: tintFor(conv.mood), boxShadow: `0 0 10px ${tintFor(conv.mood)}` }}
            aria-hidden
          />
          <span style={{ color: "#A8B2C8" }}>
            STATUS:{" "}
            <span style={{ color: tintFor(conv.mood) }}>
              {conv.mood ? `${MOODS.find((m) => m.v === conv.mood)?.label.toUpperCase()} · ${conv.mood}/10` : "—"}
            </span>
          </span>
        </div>
        <button
          onClick={onNewSession}
          className="rounded-md px-3 py-1.5 font-mono-tech text-[11px] uppercase tracking-wider transition-colors hover:bg-white/10"
          style={{ border: "1px solid rgba(0,212,170,0.4)", color: "#00D4AA" }}
        >
          + NEW
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="hud-grid flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {conv.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onMoodPick={(v) => conv.updateMood(v)} />
          ))}
          {conv.isLoading && <TypingBubble />}
          {conv.error && (
            <div
              className="glass mx-auto max-w-md px-4 py-2 text-center text-xs"
              style={{ borderLeft: "3px solid #FF4D6D", color: "#FFB3C0" }}
              role="alert"
            >
              {conv.error}
            </div>
          )}
        </div>
      </div>

      {/* Crisis banner */}
      {showCrisis && (
        <div
          className="mx-4 mb-2 rounded-2xl px-4 py-3 text-sm"
          role="alert"
          style={{
            background: "rgba(255,77,109,0.12)",
            border: "1px solid rgba(255,77,109,0.5)",
            backdropFilter: "blur(12px)",
            color: "#FFD0D8",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg" aria-hidden>💗</span>
            <div className="flex-1">
              <strong>You're not alone.</strong> Please call{" "}
              <a className="underline" href="tel:9152987821">iCall: 9152987821</a> (Mon–Sat, 8am–10pm) or{" "}
              <a className="underline" href="tel:08046110007">NIMHANS: 080-46110007</a> (24/7). Would you like to talk
              to a human?
            </div>
            <button
              onClick={() => setShowCrisis(false)}
              aria-label="Dismiss crisis banner"
              className="rounded p-1 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 px-3 pb-3 pt-1 glass-strong" style={{ minHeight: 72 }}>
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div
            className="hidden h-11 select-none items-center px-3 font-mono-tech text-xs sm:flex"
            style={{ color: "#00D4AA", opacity: 0.7 }}
            aria-hidden
          >
            {">_"}
          </div>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Talk to MindSpace..."
            aria-label="Message MindSpace"
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.12)",
              maxHeight: 96,
              outline: "none",
            }}
          />

          <button
            onClick={handleSend}
            disabled={!draft.trim() || conv.isLoading}
            aria-label="Send message"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:opacity-40 gradient-btn"
            style={{ boxShadow: "0 6px 18px -6px rgba(123,47,190,0.7)" }}
          >
            {conv.isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────── MESSAGE BUBBLES ────────── */

function MessageBubble({ msg, onMoodPick }: { msg: Message; onMoodPick: (v: number) => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end animate-slide-right">
        <div className="max-w-[75%]">
          <div
            className="px-4 py-3 text-sm text-white"
            style={{
              background: "linear-gradient(135deg, #7B2FBE 0%, #5B1FA0 100%)",
              borderRadius: "18px 18px 4px 18px",
              boxShadow: "0 6px 18px -8px rgba(123,47,190,0.6)",
            }}
          >
            {msg.text}
          </div>
          <div className="mt-1 text-right text-[11px]" style={{ color: "#5A6478" }}>
            {fmtTime(msg.ts)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 animate-slide-left">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: "linear-gradient(135deg, #7B2FBE, #00D4AA)" }}
        aria-hidden
      >
        🧠
      </div>
      <div className="max-w-[80%] flex-1">
        <div
          className="glass px-4 py-3 text-sm leading-relaxed text-white"
          style={{ borderRadius: "18px 18px 18px 4px" }}
          aria-label={`MindSpace says: ${msg.text}`}
        >
          {msg.text}
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "#5A6478" }}>
          {fmtTime(msg.ts)}
        </div>
        {msg.ai && <AIExtras ai={msg.ai} onMoodPick={onMoodPick} />}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2 animate-slide-left">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: "linear-gradient(135deg, #7B2FBE, #00D4AA)" }}
        aria-hidden
      >
        🧠
      </div>
      <div>
        <div
          className="glass flex items-center px-4 py-3"
          style={{ borderRadius: "18px 18px 18px 4px" }}
        >
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "#5A6478" }}>
          MindSpace is thinking…
        </div>
      </div>
    </div>
  );
}

function AIExtras({ ai, onMoodPick }: { ai: AIData; onMoodPick: (v: number) => void }) {
  return (
    <div className="mt-3 space-y-3">
      {ai.stressTriggers && ai.stressTriggers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ai.stressTriggers.map((t, i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "rgba(255,77,109,0.12)",
                border: "1px solid rgba(255,77,109,0.4)",
                color: "#FF8597",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {ai.copingCards && ai.copingCards.length > 0 && (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
          {ai.copingCards.map((c, i) => (
            <div
              key={i}
              className="glass card-hover w-[200px] shrink-0 p-4 animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-2xl" aria-hidden>{c.icon ?? "🌱"}</div>
              <div className="mt-1.5 text-sm font-semibold text-white">{c.title}</div>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "#A8B2C8" }}>
                {c.description}
              </p>
              {c.duration && (
                <span
                  className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    background: "rgba(0,212,170,0.15)",
                    color: "#00D4AA",
                    border: "1px solid rgba(0,212,170,0.4)",
                  }}
                >
                  {c.duration}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {ai.suggestTimer && ai.exercise && <Timer ex={ai.exercise} />}

      {ai.moodCheckIn && <InlineMoodCheckIn onPick={onMoodPick} />}

      {ai.motivationalMessage && (
        <blockquote
          className="rounded-xl px-4 py-3 text-center font-display text-sm italic"
          style={{
            background: "rgba(123,47,190,0.08)",
            border: "1px solid rgba(123,47,190,0.3)",
            color: "#E6E9F2",
          }}
        >
          "{ai.motivationalMessage}"
        </blockquote>
      )}
    </div>
  );
}

function InlineMoodCheckIn({ onPick }: { onPick: (v: number) => void }) {
  const quick = [
    { v: 2, e: "😞" },
    { v: 4, e: "😐" },
    { v: 6, e: "🙂" },
    { v: 8, e: "😄" },
    { v: 10, e: "💪" },
  ];
  return (
    <div className="glass p-3">
      <div className="text-xs" style={{ color: "#A8B2C8" }}>
        How are you feeling now?
      </div>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Mood check-in">
        {quick.map((q) => (
          <button
            key={q.v}
            onClick={(e) => {
              onPick(q.v);
              emojiBurst(q.e, e.clientX, e.clientY, 6);
            }}
            role="radio"
            aria-checked={false}
            aria-label={`Mood ${q.v}`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {q.e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────── TIMER ────────── */

function Timer({ ex }: { ex: AIData["exercise"] & {} }) {
  const [remaining, setRemaining] = useState(ex.durationSec);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, remaining]);

  useEffect(() => {
    if (remaining <= 0 && active) {
      setActive(false);
      setDone(true);
    }
  }, [remaining, active]);

  const pct = 1 - remaining / ex.durationSec;
  const stepIdx = Math.min(ex.steps.length - 1, Math.floor(pct * ex.steps.length));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="glass relative mx-auto w-[280px] overflow-hidden p-5">
      {done && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10px",
                background: ["#7B2FBE", "#00D4AA", "#FF4D6D", "#F5C451"][i % 4],
                borderRadius: i % 2 ? "50%" : "2px",
                animation: `confettiFall ${2 + Math.random() * 2}s ease-in ${Math.random()}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <h4 className="text-center font-display text-sm font-semibold">{ex.name}</h4>

      <div className="mt-3 flex justify-center">
        <div className="relative">
          <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden>
            <defs>
              <linearGradient id={`ring-${ex.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7B2FBE" />
                <stop offset="100%" stopColor="#00D4AA" />
              </linearGradient>
            </defs>
            <circle cx="65" cy="65" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
            <circle
              cx="65" cy="65" r={radius}
              stroke={`url(#ring-${ex.name})`}
              strokeWidth="8" strokeLinecap="round" fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (remaining / ex.durationSec)}
              transform="rotate(-90 65 65)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-display" aria-live="polite">
            <div className="text-xl font-bold">{mm}:{ss}</div>
            <div className="text-[10px]" style={{ color: "#A8B2C8" }}>
              {done ? "Complete" : active ? "Breathing…" : "Ready"}
            </div>
          </div>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {ex.steps.map((s, i) => {
          const isActive = i === stepIdx && active;
          const isDone = i < stepIdx;
          return (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md px-2 py-1 text-[12px]"
              style={{
                background: isActive ? "rgba(0,212,170,0.12)" : "transparent",
                color: isDone ? "#5A6478" : "#fff",
              }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  background: isActive ? "#00D4AA" : isDone ? "rgba(255,255,255,0.1)" : "rgba(123,47,190,0.4)",
                  color: isActive ? "#0D0D1A" : "#fff",
                }}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => setActive((a) => !a)}
          disabled={done}
          aria-label={active ? "Pause" : "Start"}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 gradient-btn"
        >
          {active ? "Pause" : remaining === ex.durationSec ? "Start" : "Resume"}
        </button>
        <button
          onClick={() => {
            setActive(false);
            setRemaining(ex.durationSec);
            setDone(false);
          }}
          aria-label="Reset"
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
          }}
        >
          Reset
        </button>
      </div>

      {done && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-center text-xs font-medium shimmer"
          style={{ color: "#00D4AA", border: "1px solid #00D4AA" }}
          role="status"
        >
          Well done! 🎉
        </div>
      )}
    </div>
  );
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
