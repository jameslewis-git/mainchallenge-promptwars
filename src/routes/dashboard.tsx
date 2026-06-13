import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Particles } from "@/components/mindspace/Particles";
import { getUser, isAuthenticated, logout } from "@/lib/auth-store";
import { loadThreads, createThread, upsertThread } from "@/lib/mindspace-store";
import type { Thread } from "@/lib/mindspace-store";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../lib/theme-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MindSpace" },
      { name: "description", content: "Your MindSpace wellness dashboard." },
    ],
  }),
  component: DashboardPage,
});

/* ── Helpers ── */
function moodColor(m: number | null) {
  if (!m) return "#5A6478";
  if (m <= 3) return "#FF4D6D";
  if (m <= 6) return "#F5C451";
  return "#00D4AA";
}

function moodLabel(m: number | null) {
  if (!m) return "—";
  const labels: Record<number, string> = {
    1: "Crushed", 2: "Awful", 3: "Bad",
    4: "Low", 5: "Okay", 6: "Alright",
    7: "Good", 8: "Great", 9: "Amazing", 10: "Unstoppable",
  };
  return labels[m] ?? String(m);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

/* ── Stat Card ── */
function StatCard({ icon, value, label, sub, color }: {
  icon: string; value: string | number; label: string; sub: string; color: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col gap-1 animate-fade-up card-hover"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="font-display text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-sm font-semibold" style={{ color }}>{label}</div>
      <div className="text-xs" style={{ color: "var(--muted-color)" }}>{sub}</div>
    </div>
  );
}

/* ── Custom Tooltip for chart ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: "var(--glass-strong)",
        border: "1px solid var(--glass-strong-border)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ color: "var(--soft-color)" }}>{label}</div>
      <div className="font-bold" style={{ color: moodColor(v) }}>
        Mood: {v}/10 — {moodLabel(v)}
      </div>
    </div>
  );
}

/* ── Session Card ── */
function SessionCard({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  const lastMsg = thread.messages.filter(m => m.role === "assistant").at(-1);
  const c = moodColor(thread.mood);
  return (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-2xl p-4 card-hover transition-all group cursor-pointer animate-fade-up"
      style={{ borderTop: `2px solid ${c}40` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {thread.examType && (
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-violet/15 border border-violet/30 text-violet"
              >
                {thread.examType}
              </span>
            )}
            <span className="text-[10px]" style={{ color: "var(--muted-color)" }}>
              {fmtDate(thread.updatedAt)}
            </span>
          </div>
          <div className="text-sm font-semibold truncate group-hover:text-teal transition-colors" style={{ color: "var(--text-primary)" }}>
            {thread.title || "New session"}
          </div>
          {lastMsg && (
            <div
              className="mt-1 text-xs line-clamp-2 leading-relaxed"
              style={{ color: "var(--muted-color)" }}
            >
              {lastMsg.text.slice(0, 100)}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${c}22`, border: `2px solid ${c}`, color: c }}
          >
            {thread.mood ?? "—"}
          </div>
          <div className="text-[10px] mt-1" style={{ color: c }}>
            {moodLabel(thread.mood)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: "var(--muted-color)" }}>
        <span>💬 {thread.messages.length} messages</span>
      </div>
    </button>
  );
}

/* ── Insights ── */
const INSIGHTS = [
  { icon: "🌬️", title: "Box Breathing", desc: "4-4-4-4 breathing when stress peaks. Opens the calm channel.", tag: "2 min" },
  { icon: "📓", title: "Micro-journal", desc: "Write 3 things that went okay today. No filter needed.", tag: "5 min" },
  { icon: "🎯", title: "One-task focus", desc: "Study one topic for 25 min, rest 5. The Pomodoro beat burnout.", tag: "30 min" },
  { icon: "🚶", title: "Walk & reset", desc: "Leave the desk. Look at something 20 feet away for 30 seconds.", tag: "10 min" },
];

/* ── Main Dashboard ── */
function DashboardPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const user = getUser();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setThreads(loadThreads());
  }, [navigate]);

  const stats = useMemo(() => {
    const withMood = threads.filter((t) => t.mood !== null);
    const avgMood = withMood.length
      ? Math.round((withMood.reduce((s, t) => s + (t.mood ?? 0), 0) / withMood.length) * 10) / 10
      : null;
    const totalMessages = threads.reduce((s, t) => s + t.messages.length, 0);
    const bestMood = withMood.length ? Math.max(...withMood.map((t) => t.mood ?? 0)) : null;
    return { sessions: threads.length, avgMood, totalMessages, bestMood };
  }, [threads]);

  const chartData = useMemo(() => {
    return [...threads]
      .filter((t) => t.mood !== null)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-10)
      .map((t) => ({
        name: fmtDate(t.createdAt),
        mood: t.mood,
        exam: t.examType ?? "",
      }));
  }, [threads]);

  const handleNewSession = () => {
    const t = createThread();
    upsertThread(t);
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const insightIdx = new Date().getDate() % INSIGHTS.length;
  const todayInsight = INSIGHTS[insightIdx];

  return (
    <div className="relative min-h-dvh w-full">
      <Particles />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Top nav ── */}
        <nav className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold gradient-text">🧠 MINDSPACE</span>
            <span
              className="hidden sm:inline rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider bg-teal/10 border border-teal/30 text-teal"
            >
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2.5 rounded-xl glass hover:bg-white/10 dark:hover:bg-white/5 transition-all cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <div
              className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg,#7B2FBE,#00D4AA)", color: "#fff" }}
              >
                {user?.avatar ?? "A"}
              </div>
              <span style={{ color: "var(--soft-color)" }}>{user?.name ?? "User"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80 cursor-pointer"
              style={{ background: "rgba(255,77,109,0.12)", border: "1px solid rgba(255,77,109,0.3)", color: "#FF8597" }}
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* ── Hero greeting ── */}
        <div
          className="rounded-3xl p-7 mb-6 relative overflow-hidden animate-fade-up"
          style={{
            background: "linear-gradient(135deg, rgba(123,47,190,0.18) 0%, rgba(0,212,170,0.07) 100%)",
            border: "1px solid var(--glass-strong-border)",
          }}
        >
          {/* Decorative orbs */}
          <div
            className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-8 left-10 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(123,47,190,0.15) 0%, transparent 70%)" }}
          />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-mono text-teal">
                {today}
              </div>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {greeting()},{" "}
                <span className="gradient-text">{user?.name ?? "there"}</span> 👋
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--soft-color)" }}>
                {stats.sessions === 0
                  ? "Start your first session and let MindSpace guide you."
                  : `You've had ${stats.sessions} session${stats.sessions > 1 ? "s" : ""}. Your journey is progressing.`}
              </p>
            </div>
            <button
              onClick={handleNewSession}
              className="shrink-0 relative overflow-hidden rounded-2xl px-6 py-3.5 font-semibold text-white text-sm gradient-btn transition-all hover:scale-105 cursor-pointer"
              style={{ boxShadow: "0 0 32px rgba(123,47,190,0.4)" }}
            >
              <span className="relative z-10">+ New Session</span>
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon="🗂️"
            value={stats.sessions}
            label="Sessions"
            sub="Total recorded"
            color="#7B2FBE"
          />
          <StatCard
            icon="💬"
            value={stats.totalMessages}
            label="Messages"
            sub="Exchanged with AI"
            color="#00D4AA"
          />
          <StatCard
            icon="😊"
            value={stats.avgMood != null ? `${stats.avgMood}/10` : "—"}
            label="Avg Mood"
            sub="Across all sessions"
            color={moodColor(stats.avgMood)}
          />
          <StatCard
            icon="🏆"
            value={stats.bestMood != null ? `${stats.bestMood}/10` : "—"}
            label="Best Mood"
            sub="Your highest recorded"
            color="#F5C451"
          />
        </div>

        {/* ── Main content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Mood Journey Chart ── */}
          <div className="lg:col-span-2 glass rounded-3xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-primary" style={{ color: "var(--text-primary)" }}>Mood Journey</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-color)" }}>
                  Last {chartData.length} sessions with mood data
                </p>
              </div>
              <div
                className="rounded-lg px-2 py-1 font-mono text-[10px] uppercase bg-teal/10 text-teal border border-teal/20"
              >
                Live
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--teal-color)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--violet-color)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-color)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: "var(--muted-color)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="var(--teal-color)"
                    strokeWidth={2.5}
                    fill="url(#moodGrad)"
                    dot={{ fill: "var(--teal-color)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--teal-color)", stroke: "var(--bg-1)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">📈</div>
                <div className="text-sm" style={{ color: "var(--muted-color)" }}>
                  Start sessions to see your mood trend
                </div>
              </div>
            )}

            {/* Mood scale legend */}
            <div className="mt-3 flex items-center gap-4 text-[10px]" style={{ color: "var(--muted-color)" }}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--coral-color)" }} /> 1–3 High stress
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: "#F5C451" }} /> 4–6 Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--teal-color)" }} /> 7–10 Thriving
              </span>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* Today's tip */}
            <div
              className="glass rounded-3xl p-5 animate-fade-up"
              style={{
                animationDelay: "150ms",
                borderTop: "2px solid var(--glass-strong-border)",
              }}
            >
              <div className="text-xs uppercase tracking-wider font-semibold mb-3 text-teal">
                💡 Today's insight
              </div>
              <div className="text-2xl mb-2">{todayInsight.icon}</div>
              <div className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>{todayInsight.title}</div>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--soft-color)" }}>
                {todayInsight.desc}
              </p>
              <span
                className="mt-3 inline-block rounded-full px-2 py-0.5 text-[10px] bg-teal/10 border border-teal/30 text-teal"
              >
                {todayInsight.tag}
              </span>
            </div>

            {/* Mental health score */}
            <div
              className="glass rounded-3xl p-5 animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              <div className="text-xs uppercase tracking-wider font-semibold mb-3 text-violet">
                🧠 Wellness index
              </div>
              {stats.avgMood != null ? (
                <>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="font-display text-4xl font-bold" style={{ color: moodColor(stats.avgMood) }}>
                      {Math.round(stats.avgMood * 10)}
                    </span>
                    <span className="text-sm mb-1" style={{ color: "var(--muted-color)" }}>/100</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "var(--glass-strong-border)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stats.avgMood * 10}%`,
                        background: `linear-gradient(90deg, ${moodColor(stats.avgMood)}, var(--violet-color))`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted-color)" }}>
                    Based on {stats.sessions} session{stats.sessions !== 1 ? "s" : ""} average mood
                  </p>
                </>
              ) : (
                <div className="text-xs" style={{ color: "var(--muted-color)" }}>
                  Complete a session to see your wellness index.
                </div>
              )}
            </div>

            {/* Quick nav to chat */}
            <button
              onClick={handleNewSession}
              className="glass rounded-3xl p-5 text-left card-hover transition-all group animate-fade-up cursor-pointer"
              style={{
                animationDelay: "250ms",
                borderBottom: "2px solid var(--glass-strong-border)",
              }}
            >
              <div className="text-2xl mb-2">🚀</div>
              <div className="font-display text-sm font-bold group-hover:text-teal transition-all" style={{ color: "var(--text-primary)" }}>
                Start a new session
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--muted-color)" }}>
                Talk to MindSpace → your AI companion is ready
              </p>
            </button>
          </div>
        </div>

        {/* ── Recent Sessions ── */}
        {threads.length > 0 && (
          <div className="mt-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-primary" style={{ color: "var(--text-primary)" }}>Recent Sessions</h2>
              <Link
                to="/chat/$threadId"
                params={{ threadId: threads[0]?.id ?? "" }}
                className="text-xs transition-opacity hover:opacity-80 text-teal"
              >
                Continue last →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {threads.slice(0, 6).map((t) => (
                <SessionCard
                  key={t.id}
                  thread={t}
                  onClick={() =>
                    navigate({ to: "/chat/$threadId", params: { threadId: t.id } })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {threads.length === 0 && (
          <div
            className="mt-4 rounded-3xl p-12 text-center animate-fade-up glass"
            style={{ animationDelay: "200ms" }}
          >
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Your journey starts here
            </h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--soft-color)" }}>
              MindSpace learns from your conversations. Start your first session — tell it how you're
              feeling, and it'll be there for you, every step of your exam prep.
            </p>
            <button
              onClick={handleNewSession}
              className="mt-6 rounded-2xl px-8 py-3.5 font-semibold text-white text-sm gradient-btn transition-all hover:scale-105 cursor-pointer"
              style={{ boxShadow: "0 0 28px rgba(123,47,190,0.4)" }}
            >
              Begin your first session →
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-8 text-center text-[11px]" style={{ color: "var(--muted-color)" }}>
          Crisis support: iCall 9152987821 · NIMHANS 080-46110007 · MindSpace is not a substitute for professional care.
        </div>
      </div>
    </div>
  );
}
