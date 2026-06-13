import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isAuthenticated, login, MOCK_CREDENTIALS } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — MindSpace" },
      { name: "description", content: "Sign in to your MindSpace wellness companion." },
    ],
  }),
  component: LoginPage,
});

/* ── Neural network canvas animation ── */
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Nodes
    const nodes = Array.from({ length: 38 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.02;
        if (n.x < 0 || n.x > W()) n.vx *= -1;
        if (n.y < 0 || n.y > H()) n.vy *= -1;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(123,47,190,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const glow = 0.6 + 0.4 * Math.sin(n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,170,${glow * 0.8})`;
        ctx.shadowColor = "#00D4AA";
        ctx.shadowBlur = 8 * glow;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ── Typewriter ── */
function Typewriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = texts[idx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 2400);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % texts.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx, texts]);

  return (
    <span>
      {displayed}
      <span
        className="inline-block w-0.5 h-5 ml-0.5 align-middle animate-pulse"
        style={{ background: "#00D4AA" }}
      />
    </span>
  );
}

const SECURITY_BADGES = [
  { icon: "🔒", label: "Zero Knowledge", sub: "Your thoughts never leave your device unencrypted" },
  { icon: "🛡️", label: "Private by Design", sub: "No message content stored on any server" },
  { icon: "🚫", label: "No Data Sold", sub: "We don't monetize your mental health data" },
  { icon: "⚡", label: "Always Available", sub: "AI companion online 24/7 even when stressed" },
];

import { useTheme } from "../lib/theme-store";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  const fillDemo = () => {
    setEmail(MOCK_CREDENTIALS.email);
    setPassword(MOCK_CREDENTIALS.password);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    const result = login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  return (
    <div
      className="min-h-dvh w-full flex overflow-hidden relative"
      style={{
        background: "var(--gradient-bg)",
      }}
    >
      {/* Floating Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute top-4 right-4 z-50 p-2.5 rounded-xl glass hover:bg-white/10 dark:hover:bg-white/5 transition-all cursor-pointer"
        style={{ color: "var(--text-primary)" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <NeuralCanvas />

        {/* Top logo */}
        <div className="relative z-10">
          <div className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: "var(--teal-color)" }}>
            // MINDSPACE_v1.0
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold leading-tight">
            <span className="gradient-text">
              MINDSPACE
            </span>
          </h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--soft-color)", maxWidth: 400 }}>
            The AI-powered mental wellness companion built exclusively for students conquering
            India's toughest competitive exams.
          </p>
        </div>

        {/* Typewriter center */}
        <div className="relative z-10 text-center">
          <div
            className="font-display text-3xl font-semibold"
            style={{ color: "var(--text-primary)", minHeight: 80 }}
          >
            <Typewriter
              texts={[
                "Your mind. Your space.",
                "Study smarter, not harder.",
                "Anxiety doesn't define you.",
                "One breath at a time. 🌬️",
                "You're closer than you think.",
              ]}
            />
          </div>
        </div>

        {/* Security badges */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {SECURITY_BADGES.map((b) => (
            <div
              key={b.label}
              className="glass rounded-xl p-3"
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                <span>{b.icon}</span>
                {b.label}
              </div>
              <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--soft-color)" }}>
                {b.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: Login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(123,47,190,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="font-display text-3xl font-bold gradient-text">🧠 MINDSPACE</div>
            <p className="mt-1 text-sm" style={{ color: "var(--soft-color)" }}>
              Your calm in the chaos of exam prep
            </p>
          </div>

          {/* Card */}
          <div
            className="glass rounded-3xl p-8"
            style={{
              boxShadow: "0 24px 80px -16px rgba(0,0,0,0.35), 0 0 0 1px rgba(123,47,190,0.1)",
            }}
          >
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Welcome back</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--soft-color)" }}>
                Sign in to continue your wellness journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--soft-color)" }}
                >
                  Email
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                    aria-hidden
                  >
                    ✉️
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all"
                    style={{
                      background: "var(--input-bg)",
                      border: email ? "1px solid var(--teal-color)" : "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal-color)")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = email
                        ? "var(--teal-color)"
                        : "var(--input-border)")
                    }
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--soft-color)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                    aria-hidden
                  >
                    🔑
                  </span>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm transition-all"
                    style={{
                      background: "var(--input-bg)",
                      border: password ? "1px solid var(--teal-color)" : "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal-color)")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = password
                        ? "var(--teal-color)"
                        : "var(--input-border)")
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg p-1 rounded-md transition-opacity hover:opacity-100 opacity-50"
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl px-4 py-2.5 text-xs"
                  role="alert"
                  style={{
                    background: "rgba(255,77,109,0.12)",
                    border: "1px solid rgba(255,77,109,0.4)",
                    color: "#FFB3C0",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  setTimeout(() => setRipple(null), 600);
                }}
                className="relative w-full overflow-hidden rounded-xl py-3.5 font-semibold text-white text-sm disabled:opacity-60 transition-all cursor-pointer"
                style={{
                  background: "var(--gradient-btn)",
                  boxShadow: loading ? "none" : "0 0 28px rgba(123,47,190,0.5)",
                }}
              >
                {ripple && (
                  <span
                    className="absolute rounded-full animate-ping"
                    style={{
                      left: ripple.x - 60,
                      top: ripple.y - 60,
                      width: 120,
                      height: 120,
                      background: "rgba(255,255,255,0.2)",
                      animationDuration: "0.6s",
                      animationIterationCount: 1,
                    }}
                  />
                )}
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in →"
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                background: "rgba(0,212,170,0.06)",
                border: "1px solid rgba(0,212,170,0.2)",
              }}
            >
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--teal-color)" }}>
                ✨ Demo credentials
              </div>
              <div className="text-xs space-y-0.5" style={{ color: "var(--soft-color)" }}>
                <div>
                  Email:{" "}
                  <code style={{ color: "var(--text-primary)" }}>{MOCK_CREDENTIALS.email}</code>
                </div>
                <div>
                  Password:{" "}
                  <code style={{ color: "var(--text-primary)" }}>{MOCK_CREDENTIALS.password}</code>
                </div>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="mt-2.5 w-full rounded-lg py-1.5 text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
                style={{
                  background: "rgba(0,212,170,0.15)",
                  border: "1px solid rgba(0,212,170,0.4)",
                  color: "var(--teal-color)",
                }}
              >
                Fill demo credentials
              </button>
            </div>

            {/* Privacy footer */}
            <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: "var(--muted-color)" }}>
              🔒 Your journal entries are never stored on our servers.{" "}
              <br />All processing is ephemeral and private to your session.
            </p>
          </div>

          {/* External links */}
          <div className="mt-6 flex justify-center gap-4 text-xs" style={{ color: "var(--muted-color)" }}>
            <span>iCall crisis line: 9152987821</span>
            <span>·</span>
            <span>NIMHANS: 080-46110007</span>
          </div>
        </div>
      </div>
    </div>
  );
}
