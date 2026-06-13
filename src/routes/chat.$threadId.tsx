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
import { useTheme } from "../lib/theme-store";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatPage,
});

// Audio Synth states for Binaural Beats
let audioCtx: AudioContext | null = null;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let merger: ChannelMergerNode | null = null;

function playBinauralBeat(freq: number, beatFreq: number, volume: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    osc1 = audioCtx.createOscillator();
    osc2 = audioCtx.createOscillator();
    osc1.frequency.value = freq;
    osc2.frequency.value = freq + beatFreq;
    merger = audioCtx.createChannelMerger(2);
    const g1 = audioCtx.createGain();
    const g2 = audioCtx.createGain();
    g1.gain.value = 0.5;
    g2.gain.value = 0.5;
    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(merger, 0, 0);
    g2.connect(merger, 0, 1);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    merger.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc1.start();
    osc2.start();
  } catch (e) {
    console.error("Audio API error", e);
  }
}

function stopBinauralBeat() {
  try {
    if (osc1) { osc1.stop(); osc1.disconnect(); osc1 = null; }
    if (osc2) { osc2.stop(); osc2.disconnect(); osc2 = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  } catch (e) {
    console.error("Audio stop error", e);
  }
}

function setBinauralBeatVolume(volume: number) {
  if (gainNode && audioCtx) {
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  }
}

const EXAMS = ["NEET", "JEE", "CUET", "CAT", "GATE", "UPSC", "CET", "Other"];

const EXAM_ICONS: Record<string, string> = {
  NEET: "🩺",
  JEE: "⚙️",
  CUET: "🎓",
  CAT: "📊",
  GATE: "🛡️",
  UPSC: "🏛️",
  CET: "🧬",
  Other: "🔮",
};

const SPARKS = [
  { label: "😫 Backlog Panic", text: "I feel completely overwhelmed by the amount of backlog I have to cover. I can't sleep and feel like I'm running out of time." },
  { label: "⏳ Procrastination Loop", text: "I'm stuck in a bad procrastination loop. Every time I open my books, I get distracted or feel too anxious to start studying." },
  { label: "🤯 Exam Tomorrow", text: "My exam is tomorrow, and my heart is racing. I feel like I've forgotten everything I studied and I'm starting to panic." },
  { label: "🔋 Study Burnout", text: "I've been studying 12 hours a day and now my brain feels like mush. I have zero motivation and feel completely exhausted." },
  { label: "🥺 Fear of Failure", text: "I'm putting in the effort, but I keep doubting myself. I'm terrified of letting everyone down if I don't clear the exam." }
];

const BREATHING_PRESETS = [
  {
    name: "4-7-8 Calm",
    durationSec: 60,
    steps: [
      "Breathe in through nose for 4s",
      "Hold breath for 7s",
      "Exhale through mouth for 8s",
      "Repeat cycle"
    ]
  },
  {
    name: "Box Breathing (Focus)",
    durationSec: 64,
    steps: [
      "Inhale for 4s",
      "Hold for 4s",
      "Exhale for 4s",
      "Hold for 4s"
    ]
  },
  {
    name: "Balanced Breath (5-5)",
    durationSec: 50,
    steps: [
      "Breathe in for 5s",
      "Breathe out for 5s",
      "Repeat rhythmically"
    ]
  }
];

const BEAT_PRESETS = [
  { name: "Alpha (Focus)", freq: 140, beatFreq: 10, label: "10Hz (Concentration & flow state)" },
  { name: "Theta (Meditation)", freq: 140, beatFreq: 6, label: "6Hz (Anxiety relief & calm)" },
  { name: "Delta (Sleep)", freq: 140, beatFreq: 2.5, label: "2.5Hz (Deep relaxation & rest)" },
];

const GROUNDING_STEPS = [
  { key: 5, label: "👁️ Look at 5 things around you", sub: "Observe shapes, colors, or objects in your room" },
  { key: 4, label: "🫳 Acknowledge 4 things you can touch", sub: "Feel the texture of your desk, clothes, or chair" },
  { key: 3, label: "👂 Listen for 3 distinct sounds", sub: "Hear traffic, a fan, or distant chatter" },
  { key: 2, label: "👃 Detect 2 things you can smell", sub: "Notice coffee, wood, or the scent of the air" },
  { key: 1, label: "👅 Name 1 thing you can taste", sub: "Recall the taste of water, mint, or food" }
];

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

const SUGGESTED_PROMPTS = [
  { label: "💨 Breathing Exercise", prompt: "I want to do a breathing exercise to calm down." },
  { label: "📚 Help me focus", prompt: "I am having trouble focusing on my studies. Can you help me?" },
  { label: "🧠 Manage Exam Anxiety", prompt: "I feel very anxious about my upcoming exam. What can I do?" },
  { label: "✍️ Quick Journaling", prompt: "I want to do a quick journaling exercise to clear my head." },
  { label: "😴 Burnout Recovery", prompt: "I feel extremely burnt out from studying. How can I recover?" },
];

const tintFor = (v: number | null) => {
  if (v == null) return "var(--soft-color)";
  if (v <= 3) return "var(--coral-color)";
  if (v <= 6) return "#F5C451";
  return "var(--teal-color)";
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
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* overlay on mobile */}
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden cursor-pointer"
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
            className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors md:hidden cursor-pointer"
            style={{ color: "var(--soft-color)" }}
          >
            ✕
          </button>
        </div>

        <Link
          to="/dashboard"
          className="mb-3 w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold border border-glass-border hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          style={{ color: "var(--soft-color)" }}
        >
          📊 Dashboard
        </Link>

        <button
          onClick={onNew}
          className="mb-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg gradient-btn shrink-0 cursor-pointer"
          style={{ boxShadow: "0 8px 24px -8px rgba(123,47,190,0.4)" }}
        >
          + New session
        </button>
        <div className="mb-2 text-xs uppercase tracking-wider shrink-0" style={{ color: "var(--muted-color)" }}>
          Sessions
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
          {threads.length === 0 && (
            <div className="text-sm" style={{ color: "var(--muted-color)" }}>
              No sessions yet.
            </div>
          )}
          {threads.map((t) => {
            const active = t.id === activeId;
            return (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-lg p-2 transition-colors ${
                  active ? "bg-black/10 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <button
                  onClick={() => onSelect(t.id)}
                  className="flex-1 truncate text-left text-sm cursor-pointer"
                  style={{ color: active ? "var(--text-primary)" : "var(--soft-color)" }}
                  title={t.title}
                >
                  <div className="truncate font-medium">{t.title || "New session"}</div>
                  <div className="truncate text-xs" style={{ color: "var(--muted-color)" }}>
                    {t.examType ?? "—"} · {t.messages.length} msgs
                  </div>
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label="Delete session"
                  className="rounded-md p-1.5 text-red-500 opacity-0 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 group-hover:opacity-100 cursor-pointer"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>

        {/* Profile Card and Sign out at bottom */}
        <div className="mt-auto pt-4 border-t border-glass-border flex flex-col gap-3 shrink-0">
          {/* Quick theme toggle */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px]" style={{ color: "var(--soft-color)" }}>Theme</span>
            <button
              onClick={toggleTheme}
              className="text-xs p-1.5 rounded-lg border border-glass-border hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg,#7B2FBE,#00D4AA)", color: "#fff" }}
              >
                {user?.avatar ?? "A"}
              </div>
              <span className="text-xs truncate font-medium" style={{ color: "var(--soft-color)" }}>
                {user?.name ?? "User"}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login", replace: true });
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 shrink-0 cursor-pointer"
              style={{ color: "var(--coral-color)" }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-2 text-[10px] leading-relaxed shrink-0" style={{ color: "var(--muted-color)" }}>
          Stored only in this browser. Not a substitute for professional help.
        </div>
      </aside>
    </>
  );
}

/* ────────── ONBOARDING ────────── */

function Onboarding({ conv, onOpenSidebar }: { conv: ReturnType<typeof useConversation>; onOpenSidebar: () => void }) {
  const { theme } = useTheme();
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
    <div className="relative flex-1 flex flex-col justify-start w-full min-h-dvh overflow-hidden px-4 md:px-8 py-8">
      {/* Glow Blobs */}
      <div className="glow-blob glow-blob-1 top-[15%] left-[20%]" />
      <div className="glow-blob glow-blob-2 bottom-[20%] right-[15%]" />

      <header className="mx-auto w-full max-w-4xl flex items-start justify-between gap-4 animate-fade-up border-b border-glass-border pb-4 mb-6">
        <div>
          <div className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-teal">
            // MINDSPACE_CONSOLE // CORE_INIT
          </div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold tracking-tight">
            <span className="gradient-text font-black">MINDSPACE</span>
            <span className="ml-2 font-mono-tech text-xs" style={{ color: "var(--muted-color)" }}>[SYS_SETUP]</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm" style={{ color: "var(--soft-color)" }}>
            A premium cognitive sanctuary for dedicated exam preparation.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold animate-pulse-glow bg-teal/10 border border-teal/30 text-teal"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            AI COMPANION
          </span>
          <button
            onClick={onOpenSidebar}
            className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold md:hidden glass border border-glass-border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-soft"
          >
            ☰ Sessions
          </button>
        </div>
      </header>

      {/* Main Form content */}
      <div className="mx-auto w-full max-w-4xl flex flex-col md:flex-row gap-6 items-start flex-1">
        
        {/* Left column HUD Stepper */}
        <div className="hidden md:flex flex-col w-48 pr-6 border-r border-glass-border/30 justify-start gap-8 py-4 shrink-0 font-mono text-xs text-soft">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold transition-all ${
              exam ? "border-teal text-teal bg-teal/10 shadow-[0_0_12px_rgba(0,212,170,0.2)]" : "border-glass-border text-muted"
            }`}>
              {exam ? "✓" : "01"}
            </div>
            <div>
              <div className="font-bold tracking-wider">TARGET EXAM</div>
              <div className="text-[10px] text-muted truncate max-w-[100px]">{exam ? exam : "Select Exam"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold transition-all ${
              mood ? "border-teal text-teal bg-teal/10 shadow-[0_0_12px_rgba(0,212,170,0.2)]" : "border-glass-border text-muted"
            }`}>
              {mood ? "✓" : "02"}
            </div>
            <div>
              <div className="font-bold tracking-wider">CURRENT STATE</div>
              <div className="text-[10px] text-muted">{mood ? `${moodObj?.label}` : "Rate mood"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold transition-all ${
              charValid ? "border-teal text-teal bg-teal/10 shadow-[0_0_12px_rgba(0,212,170,0.2)]" : "border-glass-border text-muted"
            }`}>
              {charValid ? "✓" : "03"}
            </div>
            <div>
              <div className="font-bold tracking-wider">MIND CONSOLE</div>
              <div className="text-[10px] text-muted">{charCount >= 10 ? "Ready to sync" : `${Math.max(0, 10 - charCount)} chars needed`}</div>
            </div>
          </div>
        </div>

        {/* Right column forms */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Card 1: Exam Selection */}
          <section className="glass p-5 animate-fade-up relative overflow-hidden" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-teal font-mono font-bold text-xs">[01]</span>
              <h2 className="font-display text-sm font-bold text-primary" style={{ color: "var(--text-primary)" }}>
                Target Preparation Course
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {EXAMS.map((x) => {
                const active = exam === x;
                const icon = EXAM_ICONS[x] || "🔮";
                return (
                  <button
                    key={x}
                    onClick={() => setExam(x)}
                    aria-pressed={active}
                    className="flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer border hover:scale-[1.03]"
                    style={{
                      background: active ? "rgba(123,47,190,0.12)" : "var(--glass-bg)",
                      borderColor: active ? "var(--teal-color)" : "var(--glass-border)",
                      color: active ? "var(--teal-color)" : "var(--soft-color)",
                      boxShadow: active ? "0 4px 16px rgba(0,212,170,0.15)" : "none",
                    }}
                  >
                    <span className="text-xl mb-1">{icon}</span>
                    <span className="text-[11px] font-bold truncate w-full text-center">{x}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Card 2: Mood Spectrum Matrix */}
          <section className="glass p-5 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-teal font-mono font-bold text-xs">[02]</span>
              <h2 className="font-display text-sm font-bold text-primary" style={{ color: "var(--text-primary)" }}>
                How is your emotional battery/mood right now?
              </h2>
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
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
                    className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer border ${
                      active ? "animate-spring" : "hover:scale-105"
                    }`}
                    style={{
                      background: active ? `${c}22` : "var(--glass-bg)",
                      borderColor: active ? c : "var(--glass-border)",
                      boxShadow: active ? `0 0 16px ${c}44` : "none",
                    }}
                  >
                    <span className="text-xl" aria-hidden>{m.e}</span>
                    <span className="text-[8px] font-mono mt-1 font-bold" style={{ color: active ? c : "var(--muted-color)" }}>{m.v}</span>
                  </button>
                );
              })}
            </div>

            {moodObj && (
              <div className="mt-4 p-2.5 rounded-xl text-center text-xs font-bold animate-fade-up" style={{
                background: `${tintFor(mood)}15`,
                color: tintFor(mood),
                border: `1px solid ${tintFor(mood)}33`
              }}>
                Current vibe: <span className="underline">{moodObj.label}</span> · state index {mood}/10
              </div>
            )}
          </section>

          {/* Card 3: Mind Console Journal */}
          <section className="glass p-5 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-teal font-mono font-bold text-xs">[03]</span>
              <h2 className="font-display text-sm font-bold text-primary" style={{ color: "var(--text-primary)" }}>
                Unburden your mind (What is triggering stress, burnout, or anxiety?)
              </h2>
            </div>
            
            {/* Quick sparks suggestions */}
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Need a start? Tap a focus spark:</div>
              <div className="flex flex-wrap gap-1.5">
                {SPARKS.map((spark, idx) => (
                  <button
                    key={idx}
                    onClick={() => setJournal(spark.text)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-glass-border bg-black/5 dark:bg-white/5 hover:border-violet/40 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer text-soft font-medium"
                  >
                    {spark.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-2">
              <textarea
                id="journal"
                value={journal}
                onChange={(e) => setJournal(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder="Today I feel..."
                aria-label="Opening journal entry"
                className="w-full resize-none p-3 text-xs leading-relaxed border outline-none font-sans"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--text-primary)",
                  borderRadius: 12,
                  minHeight: 90,
                }}
              />
              {journal.length === 0 && (
                <div aria-hidden className="pointer-events-none absolute left-3 top-3 text-xs" style={{ color: "var(--muted-color)" }}>
                  {PLACEHOLDERS[placeholderIdx]}
                </div>
              )}
              
              {/* Progress counter */}
              <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[10px] font-mono">
                <span style={{ color: charValid ? "var(--teal-color)" : "var(--coral-color)" }}>
                  {charCount}
                </span>
                <span className="text-muted">/</span>
                <span className="text-muted">2000</span>
                {charCount < 10 && <span className="text-muted font-bold text-[9px]">(Min 10)</span>}
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!ready}
              aria-label="Begin your session"
              className="relative mt-4 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 font-bold text-white transition-all disabled:opacity-50 gradient-btn cursor-pointer"
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
                  <span className="relative font-bold">Synchronizing mental space...</span>
                </>
              ) : (
                <>Initialize mental space console →</>
              )}
            </button>
          </section>

        </div>
      </div>
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
  const { theme, toggleTheme } = useTheme();
  
  // Console panel open state
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Clock ticking state
  const [sysTime, setSysTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSysTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN";
        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setDraft((d) => (d ? d + " " + transcript : transcript));
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

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
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Left: Chat Feed Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header
          className="scanline sticky top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 glass-strong"
          style={{ borderBottom: "1px solid var(--glass-strong-border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              aria-label="Open sessions"
              className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-soft"
              style={{ color: "var(--text-primary)" }}
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-xs text-teal">{"//"}</span>
              <div className="font-display text-base font-bold gradient-text">MINDSPACE</div>
              <span className="font-mono-tech text-[10px]" style={{ color: "var(--muted-color)" }}>v1.0</span>
            </div>
            {conv.examType && (
              <span
                className="rounded-md px-2 py-0.5 font-mono-tech text-[11px] uppercase tracking-wider bg-violet/15 border border-violet/30 text-violet"
              >
                [{conv.examType}_MODE]
              </span>
            )}
          </div>

          {/* System Time clock */}
          <div className="hidden lg:flex items-center font-mono text-[11px] text-teal bg-teal/5 border border-teal/20 px-2.5 py-1 rounded-lg">
            SYS_TIME: {sysTime}
          </div>

          <div className="hidden items-center gap-2 font-mono-tech text-xs sm:flex">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: tintFor(conv.mood), boxShadow: `0 0 10px ${tintFor(conv.mood)}` }}
              aria-hidden
            />
            <span style={{ color: "var(--soft-color)" }}>
              STATUS:{" "}
              <span style={{ color: tintFor(conv.mood) }}>
                {conv.mood ? `${MOODS.find((m) => m.v === conv.mood)?.label.toUpperCase()} · ${conv.mood}/10` : "—"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg border border-glass-border hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Wellness Console Toggle */}
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer text-xs ${
                consoleOpen ? "border-teal/40 bg-teal/5 text-teal" : "border-glass-border text-soft"
              }`}
              title="Toggle Wellness Console"
            >
              📊 {consoleOpen ? "Console On" : "Console Off"}
            </button>

            <button
              onClick={onNewSession}
              className="rounded-md px-3 py-1.5 font-mono-tech text-[11px] uppercase tracking-wider transition-colors border border-teal/40 text-teal hover:bg-teal/5 cursor-pointer"
            >
              + NEW
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="hud-grid flex-1 overflow-y-auto px-4 py-6 scrollbar-thin" ref={scrollRef}>
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {conv.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} onMoodPick={(v) => conv.updateMood(v)} />
            ))}
            {conv.isLoading && <TypingBubble />}
            {conv.error && (
              <div
                className="glass mx-auto max-w-md px-4 py-2 text-center text-xs"
                style={{ borderLeft: "3px solid var(--coral-color)", color: "var(--coral-color)" }}
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
            className="mx-4 mb-2 rounded-2xl px-4 py-3 text-sm border border-red-400/30 bg-red-400/10 text-red-500 backdrop-blur-md"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden>💗</span>
              <div className="flex-1">
                <strong>You're not alone.</strong> Please call{" "}
                <a className="underline font-semibold" href="tel:9152987821">iCall: 9152987821</a> (Mon–Sat, 8am–10pm) or{" "}
                <a className="underline font-semibold" href="tel:08046110007">NIMHANS: 080-46110007</a> (24/7). Would you like to talk
                to a human?
              </div>
              <button
                onClick={() => setShowCrisis(false)}
                aria-label="Dismiss crisis banner"
                className="rounded p-1 opacity-70 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="sticky bottom-0 px-3 pb-3 pt-1 glass-strong animate-fade-up" style={{ minHeight: 72 }}>
          {/* Suggested Prompts */}
          {conv.messages.length <= 1 && (
            <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDraft(p.prompt);
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs border border-glass-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                  style={{ color: "var(--soft-color)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div
              className="hidden h-11 select-none items-center px-3 font-mono-tech text-xs sm:flex text-teal"
              style={{ opacity: 0.7 }}
              aria-hidden
            >
              {">_"}
            </div>

            <div className="relative flex-1 flex items-center">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Talk to MindSpace..."
                aria-label="Message MindSpace"
                rows={1}
                className="w-full resize-none rounded-2xl pl-4 pr-12 py-3 text-sm placeholder:text-soft/40 outline-none border transition-all"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--text-primary)",
                  maxHeight: 96,
                }}
              />
              {/* Mic Speech input button */}
              {recognitionRef.current && (
                <button
                  onClick={toggleListen}
                  type="button"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all cursor-pointer ${
                    isListening ? "bg-red-500/20 text-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]" : "text-soft hover:bg-black/10 dark:hover:bg-white/10"
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak message"}
                >
                  🎙️
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!draft.trim() || conv.isLoading}
              aria-label="Send message"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:opacity-40 gradient-btn cursor-pointer shrink-0"
              style={{ boxShadow: "0 6px 18px -6px rgba(123,47,190,0.5)" }}
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

      {/* Right: Wellness Console (Desktop Panel) */}
      {consoleOpen && (
        <div className="hidden lg:flex w-[340px] border-l border-glass-border/30 glass-strong flex-col h-full overflow-y-auto scrollbar-thin p-4 shrink-0 animate-fade-up">
          <WellnessConsole conv={conv} />
        </div>
      )}

      {/* Right: Wellness Console (Mobile slide drawer overlay) */}
      {consoleOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConsoleOpen(false)} />
          <div className="relative w-[300px] h-full border-l border-glass-border/30 glass-strong flex flex-col overflow-y-auto p-4 animate-slide-left">
            <div className="flex items-center justify-between mb-4 border-b border-glass-border/30 pb-2">
              <span className="font-display font-bold text-sm text-teal">📊 Wellness Console</span>
              <button onClick={() => setConsoleOpen(false)} className="text-soft text-sm p-1">✕</button>
            </div>
            <WellnessConsole conv={conv} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── WELLNESS CONSOLE COMPONENTS ────────── */

function WellnessConsole({ conv }: { conv: ReturnType<typeof useConversation> }) {
  const [manualExercise, setManualExercise] = useState<TimerExercise | null>(null);
  const [activeGrounding, setActiveGrounding] = useState(false);
  const currentExercise = conv.aiData?.exercise || manualExercise;

  return (
    <div className="space-y-6">
      {/* State Monitor */}
      <div className="glass p-4 border border-glass-border/30 rounded-2xl relative overflow-hidden">
        <div className="text-[10px] uppercase tracking-wider font-bold text-violet mb-2.5">🧠 STRESS STATE MONITOR</div>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-xs font-mono transition-all"
            style={{
              borderColor: conv.mood ? tintFor(conv.mood) : "var(--glass-strong-border)",
              color: conv.mood ? tintFor(conv.mood) : "var(--soft-color)",
              boxShadow: conv.mood ? `0 0 12px ${tintFor(conv.mood)}44` : "none"
            }}
          >
            {conv.mood ? `${conv.mood * 10}%` : "—"}
          </div>
          <div>
            <div className="text-xs font-bold text-primary" style={{ color: "var(--text-primary)" }}>Wellness Index</div>
            <div className="text-[10px] text-soft mt-0.5 leading-relaxed">
              {conv.mood ? (conv.mood <= 3 ? "High anxiety state detected" : conv.mood <= 6 ? "Moderate stress load" : "Optimal focus potential") : "Vitals not synced"}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-glass-border/30">
          <div className="text-[9px] text-muted mb-1.5 uppercase tracking-wider font-mono">Detected Stress Triggers:</div>
          {conv.aiData?.stressTriggers && conv.aiData.stressTriggers.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {conv.aiData.stressTriggers.map((t, i) => (
                <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400">
                  ⚠️ {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[9px] font-mono text-teal bg-teal/5 border border-teal/20 px-2 py-0.5 rounded">
              ✓ SYMBOLIC_STATE_NOMINAL
            </span>
          )}
        </div>
      </div>

      {/* Breathing guide */}
      <div className="glass p-4 border border-glass-border/30 rounded-2xl">
        <div className="text-[10px] uppercase tracking-wider font-bold text-teal mb-3 flex items-center justify-between">
          <span>🌬️ BREATHING TRAINER</span>
          {conv.aiData?.exercise && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet/10 border border-violet/30 text-violet">AI Choice</span>
          )}
        </div>

        {currentExercise ? (
          <div className="space-y-3">
            <Timer ex={currentExercise} />
            <button
              onClick={() => setManualExercise(null)}
              className="w-full text-center text-[10px] text-soft hover:underline cursor-pointer"
            >
              Clear / Switch Exercise
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-soft leading-relaxed">Select a breathing pattern to sync heart rhythm and calm nerves:</p>
            <div className="grid grid-cols-1 gap-1.5">
              {BREATHING_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setManualExercise(p)}
                  className="w-full text-left glass p-2 rounded-xl text-xs font-semibold hover:border-teal/50 hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span>{p.name}</span>
                  <span className="text-teal text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Start →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Focus Beats widget */}
      <div className="glass p-4 border border-glass-border/30 rounded-2xl">
        <div className="text-[10px] uppercase tracking-wider font-bold text-violet mb-2">🎵 FOCUS WAVE SYNTH</div>
        <p className="text-[10px] text-soft mb-3 leading-relaxed">Generate pure binaural beats directly in your browser. (Wear headphones for effect)</p>
        <BinauralSoundWidget />
      </div>

      {/* Coping tool card */}
      <div className="glass p-4 border border-glass-border/30 rounded-2xl">
        <div className="text-[10px] uppercase tracking-wider font-bold text-teal mb-3">🛡️ COPING TOOLBOX</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveGrounding(true)}
            className="glass p-3 rounded-xl hover:border-teal/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center"
          >
            <span className="text-xl">🌱</span>
            <span className="text-[11px] font-bold mt-1 text-primary" style={{ color: "var(--text-primary)" }}>Grounding</span>
            <span className="text-[9px] text-soft mt-0.5">5-4-3-2-1 Rule</span>
          </button>
          <button
            onClick={() => conv.sendMessage("Can you guide me through a 5-minute study focus routine?")}
            className="glass p-3 rounded-xl hover:border-teal/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center"
          >
            <span className="text-xl">🎯</span>
            <span className="text-[11px] font-bold mt-1 text-primary" style={{ color: "var(--text-primary)" }}>Focus Tips</span>
            <span className="text-[9px] text-soft mt-0.5">Prompt AI</span>
          </button>
        </div>
      </div>

      {activeGrounding && <GroundingModal onClose={() => setActiveGrounding(false)} />}
    </div>
  );
}

function BinauralSoundWidget() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.2);

  useEffect(() => {
    setBinauralBeatVolume(volume);
  }, [volume]);

  useEffect(() => {
    return () => {
      stopBinauralBeat();
    };
  }, []);

  const handleSelect = (name: string, freq: number, beatFreq: number) => {
    if (playing === name) {
      stopBinauralBeat();
      setPlaying(null);
    } else {
      stopBinauralBeat();
      playBinauralBeat(freq, beatFreq, volume);
      setPlaying(name);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {BEAT_PRESETS.map((p) => {
          const isActive = playing === p.name;
          return (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name, p.freq, p.beatFreq)}
              className={`w-full text-left p-2 rounded-xl text-xs flex flex-col transition-all cursor-pointer border ${
                isActive
                  ? "bg-teal/10 border-teal text-primary"
                  : "border-glass-border hover:border-violet/40"
              }`}
            >
              <div className="flex items-center justify-between w-full font-bold">
                <span style={{ color: "var(--text-primary)" }}>{p.name}</span>
                <span className="text-teal font-bold">{isActive ? "⏸️ Pause" : "▶️ Play"}</span>
              </div>
              <span className="text-[9px] text-soft mt-0.5 leading-relaxed">{p.label}</span>
            </button>
          );
        })}
      </div>

      {playing && (
        <div className="space-y-2 pt-2.5 border-t border-glass-border/30">
          <div className="flex items-center justify-between text-[10px] text-soft font-mono">
            <span>Volume: {Math.round(volume * 100)}%</span>
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 bg-teal rounded-full animate-bounce h-2" style={{ animationDelay: "0.1s" }} />
              <span className="w-0.5 bg-violet rounded-full animate-bounce h-3.5" style={{ animationDelay: "0.2s" }} />
              <span className="w-0.5 bg-teal rounded-full animate-bounce h-1.5" style={{ animationDelay: "0.3s" }} />
              <span className="w-0.5 bg-violet rounded-full animate-bounce h-3" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-glass-border rounded-lg appearance-none cursor-pointer accent-teal"
          />
        </div>
      )}
    </div>
  );
}

function GroundingModal({ onClose }: { onClose: () => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = GROUNDING_STEPS.every((s) => checked[s.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong p-6 rounded-3xl border border-glass-border/30 animate-fade-up shadow-2xl">
        <div className="flex items-center justify-between border-b border-glass-border/30 pb-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-primary" style={{ color: "var(--text-primary)" }}>
              🌱 Grounding Exercise
            </h3>
            <p className="text-[10px] text-soft mt-0.5">5-4-3-2-1 technique to rapidly anchor yourself in physical space.</p>
          </div>
          <button onClick={onClose} className="text-soft hover:text-primary p-1 cursor-pointer">✕</button>
        </div>

        <div className="space-y-2">
          {GROUNDING_STEPS.map((s) => {
            const isDone = !!checked[s.key];
            return (
              <label
                key={s.key}
                className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                  isDone
                    ? "bg-teal/5 border-teal/30 text-soft opacity-60"
                    : "border-glass-border hover:border-violet/40 text-primary"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => setChecked({ ...checked, [s.key]: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded accent-teal cursor-pointer"
                />
                <div>
                  <div className={`text-xs font-bold ${isDone ? "line-through" : ""}`} style={{ color: "var(--text-primary)" }}>
                    {s.label}
                  </div>
                  <div className="text-[9px] text-soft mt-0.5 leading-relaxed">{s.sub}</div>
                </div>
              </label>
            );
          })}
        </div>

        {allChecked ? (
          <div className="mt-4 p-3 rounded-xl bg-teal/10 border border-teal text-teal text-center font-display text-xs font-bold animate-spring">
            🎉 Grounding Complete. Take a slow deep breath.
          </div>
        ) : (
          <div className="mt-4 text-center text-[10px] text-muted">
            Perform steps sequence and check them off one by one.
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2 text-xs font-semibold gradient-btn text-white cursor-pointer"
        >
          {allChecked ? "Finish Exercise" : "Close"}
        </button>
      </div>
    </div>
  );
}

/* ────────── MESSAGE BUBBLES ────────── */

function MessageBubble({ msg, onMoodPick }: { msg: Message; onMoodPick: (v: number) => void }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(msg.text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  };

  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2.5 animate-slide-right group">
        <div className="max-w-[75%] flex flex-col items-end">
          <div className="relative">
            <div
              className="px-4 py-3 text-sm text-white font-sans"
              style={{
                background: "var(--gradient-btn)",
                borderRadius: "18px 18px 4px 18px",
                boxShadow: "0 6px 18px -8px rgba(123,47,190,0.5)",
              }}
            >
              {msg.text}
            </div>
            <button
              onClick={handleCopy}
              className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
              title="Copy message"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
          <div className="mt-1 text-right text-[11px]" style={{ color: "var(--muted-color)" }}>
            {fmtTime(msg.ts)}
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 self-start shadow-[0_0_8px_rgba(0,212,170,0.3)]"
          style={{ background: "linear-gradient(135deg, #00D4AA, #7B2FBE)", color: "#fff" }}
        >
          {getUser()?.avatar ?? "U"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-slide-left group">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base shadow-[0_0_8px_rgba(123,47,190,0.3)]"
        style={{ background: "linear-gradient(135deg, #7B2FBE, #00D4AA)" }}
        aria-hidden
      >
        🧠
      </div>
      <div className="max-w-[80%] flex-1">
        <div className="relative">
          <div
            className="glass px-4 py-3 text-sm leading-relaxed border-l-4 font-sans"
            style={{ 
              borderRadius: "18px 18px 18px 4px", 
              color: "var(--text-primary)",
              borderLeftColor: msg.ai?.urgency === "high" ? "var(--coral-color)" : msg.ai?.urgency === "medium" ? "#F5C451" : "var(--teal-color)"
            }}
            aria-label={`MindSpace says: ${msg.text}`}
          >
            {msg.text}
          </div>
          
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs cursor-pointer border border-white/10"
              title="Copy message"
            >
              {copied ? "✓" : "📋"}
            </button>
            <button
              onClick={handleSpeak}
              className={`p-1.5 rounded-lg text-white text-xs cursor-pointer border border-white/10 ${
                speaking ? "bg-red-500/60 animate-pulse" : "bg-black/40 hover:bg-black/60"
              }`}
              title={speaking ? "Stop voice" : "Speak response"}
            >
              {speaking ? "⏹️" : "🔊"}
            </button>
          </div>
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--muted-color)" }}>
          {fmtTime(msg.ts)}
        </div>
        {msg.ai && <AIExtras ai={msg.ai} onMoodPick={onMoodPick} />}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5 animate-slide-left">
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
        <div className="mt-1 text-[11px]" style={{ color: "var(--muted-color)" }}>
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
              className="rounded-full px-3 py-1 text-xs font-medium border border-red-400/20 bg-red-400/10 text-red-500"
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
              className="glass card-hover w-[200px] shrink-0 p-4 animate-fade-up border border-glass-border"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-2xl" aria-hidden>{c.icon ?? "🌱"}</div>
              <div className="mt-1.5 text-sm font-semibold text-primary" style={{ color: "var(--text-primary)" }}>{c.title}</div>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--soft-color)" }}>
                {c.description}
              </p>
              {c.duration && (
                <span
                  className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] bg-teal/15 text-teal border border-teal/30"
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
          className="rounded-xl px-4 py-3 text-center font-display text-sm italic border border-violet/20 bg-violet/5"
          style={{ color: "var(--text-primary)" }}
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
      <div className="text-xs" style={{ color: "var(--soft-color)" }}>
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
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 cursor-pointer"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
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

  useEffect(() => {
    setRemaining(ex.durationSec);
    setActive(false);
    setDone(false);
  }, [ex]);

  const pct = 1 - remaining / ex.durationSec;
  const stepIdx = Math.min(ex.steps.length - 1, Math.floor(pct * ex.steps.length));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // Determine breathing phase scale & color & text
  const stepText = ex.steps[stepIdx]?.toLowerCase() || "";
  let scale = 1.0;
  let phaseColor = "var(--teal-color)";
  let phaseLabel = "Prepare";

  if (active) {
    if (stepText.includes("in") || stepText.includes("inhale") || stepText.includes("breathe in")) {
      scale = 1.45;
      phaseColor = "var(--teal-color)";
      phaseLabel = "Breathe In";
    } else if (stepText.includes("out") || stepText.includes("exhale") || stepText.includes("breathe out")) {
      scale = 0.7;
      phaseColor = "var(--violet-color)";
      phaseLabel = "Breathe Out";
    } else if (stepText.includes("hold") || stepText.includes("retain")) {
      scale = 1.15;
      phaseColor = "#F5C451";
      phaseLabel = "Hold Breath";
    }
  }

  return (
    <div className="glass relative mx-auto w-[280px] overflow-hidden p-5 animate-fade-up">
      {done && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10px",
                background: ["var(--violet-color)", "var(--teal-color)", "var(--coral-color)", "#F5C451"][i % 4],
                borderRadius: i % 2 ? "50%" : "2px",
                animation: `confettiFall ${2 + Math.random() * 2}s ease-in ${Math.random()}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <h4 className="text-center font-display text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{ex.name}</h4>

      <div className="mt-3 flex justify-center">
        <div className="relative w-[130px] h-[130px]">
          {/* Central breathing pulsing circle */}
          {active && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-20 blur-[2px] transition-all duration-[4000ms] ease-in-out"
              style={{
                transform: `translate(-50%, -50%) scale(${scale})`,
                backgroundColor: phaseColor,
                boxShadow: `0 0 16px ${phaseColor}`,
              }}
            />
          )}
          
          <svg width="130" height="130" viewBox="0 0 130 130" className="absolute top-0 left-0" aria-hidden>
            <defs>
              <linearGradient id={`ring-${ex.name.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--violet-color)" />
                <stop offset="100%" stopColor="var(--teal-color)" />
              </linearGradient>
            </defs>
            <circle cx="65" cy="65" r={radius} stroke="var(--glass-strong-border)" strokeWidth="6" fill="none" />
            <circle
              cx="65" cy="65" r={radius}
              stroke={`url(#ring-${ex.name.replace(/\s+/g, '-')})`}
              strokeWidth="6" strokeLinecap="round" fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (remaining / ex.durationSec)}
              transform="rotate(-90 65 65)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-display" aria-live="polite">
            <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{mm}:{ss}</div>
            <div className="text-[10px] font-semibold transition-colors" style={{ color: active ? phaseColor : "var(--soft-color)" }}>
              {done ? "Complete" : active ? phaseLabel : "Ready"}
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
              className="flex items-start gap-2 rounded-md px-2 py-1 text-[12px] transition-all"
              style={{
                background: isActive ? "rgba(0,212,170,0.12)" : "transparent",
                color: isDone ? "var(--muted-color)" : "var(--text-primary)",
              }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  background: isActive ? "var(--teal-color)" : isDone ? "var(--glass-strong-border)" : "var(--violet-color)",
                  color: isActive ? "var(--bg-1)" : "#fff",
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
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 gradient-btn cursor-pointer"
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
          className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer border border-glass-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{
            color: "var(--text-primary)",
          }}
        >
          Reset
        </button>
      </div>

      {done && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-center text-xs font-medium shimmer"
          style={{ color: "var(--teal-color)", border: "1px solid var(--teal-color)" }}
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
