// Spawns a burst of emojis that fly upward from a screen point.
// Pure DOM — no React state required.

export function emojiBurst(emoji: string, x: number, y: number, count = 6) {
  if (typeof document === "undefined") return;
  // Respect reduced motion.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "fly-emoji";
    el.textContent = emoji;
    el.setAttribute("aria-hidden", "true");
    const dx = (Math.random() - 0.5) * 220; // -110 to 110 px horizontal drift
    const rot = (Math.random() - 0.5) * 120;
    const delay = i * 40;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--dx", `calc(-50% + ${dx}px)`);
    el.style.setProperty("--rot", `${rot}deg`);
    el.style.animationDelay = `${delay}ms`;
    el.style.transform = "translate(-50%, 0)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500 + delay);
  }
}

export function emojiBurstFromEvent(emoji: string, e: { clientX: number; clientY: number } | React.MouseEvent) {
  emojiBurst(emoji, e.clientX, e.clientY);
}
