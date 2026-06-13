import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { useMindSpaceAuth, login, MOCK_CREDENTIALS } from "@/lib/auth-store";

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
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const { theme, toggleTheme } = useTheme();

  const { isLoaded: authLoaded, isSignedIn } = useMindSpaceAuth();
  const { isLoaded: clerkLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoaded, isSignedIn, navigate]);

  const fillDemo = () => {
    setAuthMode("signin");
    setEmail(MOCK_CREDENTIALS.email);
    setPassword(MOCK_CREDENTIALS.password);
    setError("");
  };

  const handleGoogleAuth = async () => {
    setError("");
    if (authMode === "signin") {
      if (!clerkLoaded || !signIn) {
        setError("Sign-in system is loading. Please try again.");
        return;
      }
      try {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: window.location.origin + "/login",
          redirectUrlComplete: "/dashboard",
        });
      } catch (err: any) {
        setError(err.errors?.[0]?.message || "Google sign-in failed.");
      }
    } else {
      if (!signUpLoaded || !signUp) {
        setError("Sign-up system is loading. Please try again.");
        return;
      }
      try {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: window.location.origin + "/login",
          redirectUrlComplete: "/dashboard",
        });
      } catch (err: any) {
        setError(err.errors?.[0]?.message || "Google sign-up failed.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Check if it's the local mock demo credentials (only in signin mode)
    if (
      authMode === "signin" &&
      email.trim().toLowerCase() === MOCK_CREDENTIALS.email &&
      password === MOCK_CREDENTIALS.password
    ) {
      await new Promise((r) => setTimeout(r, 600));
      const result = login(email, password);
      setLoading(false);
      if (result.ok) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setError(result.error ?? "Demo login failed.");
      }
      return;
    }

    // 2. Otherwise process via Clerk
    if (!clerkLoaded || !signUpLoaded) {
      setError("Authentication system is loading, please try again.");
      setLoading(false);
      return;
    }

    try {
      if (authMode === "signin") {
        if (!signIn) {
          setError("Sign-in function not available.");
          setLoading(false);
          return;
        }
        const result = await signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
          navigate({ to: "/dashboard", replace: true });
        } else {
          setError("Sign-in verification required. Please check your Clerk dashboard.");
        }
      } else {
        if (!signUp) {
          setError("Sign-up function not available.");
          setLoading(false);
          return;
        }
        // Sign up flow
        await signUp.create({
          emailAddress: email,
          password: password,
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setVerifying(true);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Authentication failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError("");

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (completeSignUp.status === "complete") {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        navigate({ to: "/dashboard", replace: true });
      } else {
        setError("Sign-up is not complete. Status: " + completeSignUp.status);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
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
            className="glass rounded-3xl p-8 animate-fade-in"
            style={{
              boxShadow: "0 24px 80px -16px rgba(0,0,0,0.35), 0 0 0 1px rgba(123,47,190,0.1)",
            }}
          >
            {verifying ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Verify Your Email
                  </h2>
                  <p className="mt-1.5 text-sm" style={{ color: "var(--soft-color)", lineHeight: "1.4" }}>
                    We sent a verification code to <span className="font-mono text-xs font-semibold px-1 py-0.5 rounded bg-white/5 text-teal" style={{ color: "var(--teal-color)" }}>{email}</span>. Please enter it below.
                  </p>
                </div>

                {/* Verification Code */}
                <div className="relative">
                  <label
                    htmlFor="verificationCode"
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                    style={{ color: "var(--soft-color)" }}
                  >
                    Verification Code
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                      aria-hidden
                    >
                      🔑
                    </span>
                    <input
                      id="verificationCode"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => { setVerificationCode(e.target.value); setError(""); }}
                      placeholder="••••••"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all font-mono font-bold tracking-[0.3em] text-center"
                      style={{
                        background: "var(--input-bg)",
                        border: verificationCode ? "1px solid var(--teal-color)" : "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--teal-color)")}
                      onBlur={(e) =>
                        (e.target.style.borderColor = verificationCode
                          ? "var(--teal-color)"
                          : "var(--input-border)")
                      }
                      required
                    />
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
                  className="relative w-full overflow-hidden rounded-xl py-3.5 font-semibold text-white text-sm disabled:opacity-60 transition-all cursor-pointer"
                  style={{
                    background: "var(--gradient-btn)",
                    boxShadow: loading ? "none" : "0 0 28px rgba(123,47,190,0.5)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify Code →"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifying(false);
                    setError("");
                  }}
                  className="w-full text-center text-xs font-semibold py-2 hover:underline cursor-pointer transition-opacity opacity-80 hover:opacity-100"
                  style={{ color: "var(--soft-color)" }}
                >
                  ← Back to Sign Up
                </button>
              </form>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setError("");
                    }}
                    className="flex-1 pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer text-center"
                    style={{
                      color: authMode === "signin" ? "var(--teal-color)" : "var(--soft-color)",
                      borderColor: authMode === "signin" ? "var(--teal-color)" : "transparent",
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setError("");
                    }}
                    className="flex-1 pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer text-center"
                    style={{
                      color: authMode === "signup" ? "var(--teal-color)" : "var(--soft-color)",
                      borderColor: authMode === "signup" ? "var(--teal-color)" : "transparent",
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="mb-6">
                  <h2 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {authMode === "signin" ? "Welcome back" : "Create Account"}
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--soft-color)" }}>
                    {authMode === "signin"
                      ? "Sign in to continue your wellness journey"
                      : "Get started with MindSpace today"}
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
                      Email Address
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
                        autoComplete={authMode === "signin" ? "current-password" : "new-password"}
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
                        {authMode === "signin" ? "Signing in…" : "Signing up…"}
                      </span>
                    ) : (
                      <span>{authMode === "signin" ? "Sign In →" : "Sign Up →"}</span>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="glass px-3 py-1 rounded-full text-[10px] font-mono" style={{ color: "var(--soft-color)", background: "var(--input-bg)" }}>
                      Or connect via
                    </span>
                  </div>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all cursor-pointer glass hover:bg-white/10 dark:hover:bg-white/5 border border-white/10"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Demo credentials */}
                {authMode === "signin" && (
                  <div
                    className="mt-6 rounded-xl p-4 animate-fade-in"
                    style={{
                      background: "rgba(0,212,170,0.06)",
                      border: "1px solid rgba(0,212,170,0.2)",
                    }}
                  >
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--teal-color)" }}>
                      ✨ Demo credentials (Quick Access)
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
                )}
              </>
            )}

            {/* Privacy footer */}
            <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: "var(--muted-color)" }}>
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
