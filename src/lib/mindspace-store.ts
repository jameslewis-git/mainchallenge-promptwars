// Local-storage backed thread store for MindSpace.
// All chat history lives in this browser only.

export type Role = "user" | "assistant" | "system";

export type CopingCard = {
  icon?: string;
  title: string;
  description: string;
  duration?: string;
};

export type TimerExercise = {
  name: string;
  durationSec: number;
  steps: string[];
};

export type AIData = {
  emotionalSummary?: string;
  stressTriggers?: string[];
  copingCards?: CopingCard[];
  motivationalMessage?: string;
  suggestTimer?: boolean;
  exercise?: TimerExercise;
  moodCheckIn?: boolean;
  urgency?: "low" | "medium" | "high";
};

export type Message = {
  id: string;
  role: Role;
  text: string;
  ts: number;
  ai?: AIData;
};

export type Thread = {
  id: string;
  title: string;
  examType: string | null;
  mood: number | null;
  sessionStarted: boolean;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "mindspace.threads.v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(threads));
  } catch {
    // quota / privacy mode — ignore
  }
}

export function createThread(): Thread {
  const now = Date.now();
  return {
    id: uid(),
    title: "New session",
    examType: null,
    mood: null,
    sessionStarted: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertThread(thread: Thread) {
  const all = loadThreads();
  const idx = all.findIndex((t) => t.id === thread.id);
  if (idx === -1) all.unshift(thread);
  else all[idx] = thread;
  saveThreads(all);
}

export function deleteThread(id: string) {
  saveThreads(loadThreads().filter((t) => t.id !== id));
}

export function getThread(id: string): Thread | null {
  return loadThreads().find((t) => t.id === id) ?? null;
}
