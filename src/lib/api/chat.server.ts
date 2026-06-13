import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── Types mirrored from mindspace-store (server-safe copy) ───────────────────

const CopingCardSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  description: z.string(),
  duration: z.string().optional(),
});

const TimerExerciseSchema = z.object({
  name: z.string(),
  durationSec: z.number(),
  steps: z.array(z.string()),
});

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(2000),
});

const ChatInputSchema = z.object({
  message: z.string().min(1).max(2000),
  mood: z.number().min(1).max(10).nullable().optional(),
  examType: z.string().max(40).nullable().optional(),
  history: z.array(MessageSchema).max(40).optional(),
});

// ─── Sanitizer ────────────────────────────────────────────────────────────────

function sanitize(str: string, max = 2000): string {
  return String(str)
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);
}

// ─── Fallback when Ollama is unreachable ──────────────────────────────────────

function getFallback(mood: number | null | undefined) {
  const level = (mood ?? 5) <= 3 ? "high" : (mood ?? 5) <= 6 ? "medium" : "low";
  const replies: Record<string, string> = {
    high: "I can hear that you're going through something really tough right now. It's completely valid to feel this way during exam prep. Let's try something together — take one slow breath with me. Inhale for 4 counts... hold... exhale for 4. You don't have to figure everything out right now.",
    medium:
      "Thank you for sharing that with me. Exam pressure builds up in ways we don't always notice until it becomes a lot. What's weighing on you most right now — the syllabus, time, or something else?",
    low: "You're doing better than you think. Even checking in with yourself like this takes courage. What would make today feel like a small win for you?",
  };
  return {
    reply: replies[level],
    aiData: {
      urgency: level as "low" | "medium" | "high",
      emotionalSummary:
        level === "high"
          ? "High stress detected — grounding techniques recommended."
          : "Moderate pressure, steady pace.",
      copingCards: [
        {
          icon: "🌬️",
          title: "Box Breathing",
          description: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Resets your nervous system in minutes.",
          duration: "5 min",
        },
        {
          icon: "🌿",
          title: "5-4-3-2-1 Grounding",
          description: "Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.",
          duration: "3 min",
        },
      ],
      motivationalMessage: "One breath at a time. You've handled hard days before.",
      moodCheckIn: true,
    },
  };
}

// ─── System prompt factory ────────────────────────────────────────────────────

function buildSystemPrompt(examType: string | null | undefined, mood: number | null | undefined): string {
  const exam = sanitize(examType || "NEET/JEE/CUET/CAT/GATE/UPSC", 40);
  return `You are MindSpace, a warm, empathetic mental wellness companion exclusively for Indian students preparing for ${exam} exams.

PERSONALITY: Calm, non-judgmental, evidence-based. Never clinical or robotic.
Talk like a trusted senior who has been through the same pressure.
Never open with "I understand" — be specific and human.
Reference their exam when encouraging them.
Current mood rating: ${mood ?? "unknown"}/10.

RESPONSE RULES:
- Keep replies to 3–5 sentences max
- End with one follow-up question to keep the dialogue alive
- When you detect high stress/anxiety/burnout, weave in a coping technique naturally
- Every 3–4 messages, do a gentle mood check-in
- Never give medical diagnoses or replace professional help
- If the student mentions self-harm or crisis: provide iCall (9152987821) and NIMHANS (080-46110007) immediately

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no extra text:
{
  "reply": "Your conversational message here",
  "emotionalSummary": "One sentence internal summary of their emotional state",
  "stressTriggers": null or ["trigger1", "trigger2"],
  "copingCards": null or [{ "icon": "emoji", "title": "", "description": "", "duration": "" }],
  "mindfulnessExercise": null or { "name": "", "durationSec": 180, "steps": ["step1", "step2"] },
  "moodCheckIn": null or true,
  "urgency": "low" | "medium" | "high",
  "suggestTimer": null or true,
  "motivationalMessage": null or "short quote"
}

Set copingCards only when actively suggesting a technique.
Set moodCheckIn: true every 3–4 turns or when mood seems to have shifted.
Set suggestTimer: true when recommending a timed mindfulness exercise.
Set stressTriggers to identified triggers when the user describes specific worries.`;
}

// ─── Server function ──────────────────────────────────────────────────────────

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator(ChatInputSchema)
  .handler(async ({ data }) => {
    // Read secrets inside handler — never at module scope (Nitro/CF compat).
    const OLLAMA_API_URL = process.env.OLLAMA_API_URL;
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

    // Sanitize all user messages before they reach the model.
    const sanitizedHistory = (data.history ?? []).map((m) => ({
      role: m.role,
      content: m.role === "user" ? sanitize(m.text) : m.text,
    }));

    const systemPrompt = buildSystemPrompt(data.examType, data.mood);

    // Build the messages array: system + history + current message.
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...sanitizedHistory,
      { role: "user" as const, content: sanitize(data.message) },
    ];

    if (!OLLAMA_API_URL) {
      // No API configured — return fallback so the UI is always functional.
      console.warn("[MindSpace] OLLAMA_API_URL not set — using fallback reply.");
      return getFallback(data.mood);
    }

    try {
      const res = await fetch(`${OLLAMA_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages,
          stream: false,
          options: { temperature: 0.75, num_predict: 600 },
        }),
        signal: AbortSignal.timeout(28_000),
      });

      if (!res.ok) {
        throw new Error(`Ollama API returned ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      // Ollama Cloud /api/chat returns { message: { content: "..." } }
      const raw: string = json?.message?.content ?? json?.response ?? "";

      // Extract JSON — model may wrap in markdown fences.
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object in model response");

      const parsed = JSON.parse(jsonMatch[0]);

      // Only log metadata — never the message content.
      console.log(
        `[MindSpace] ok | turns=${messages.length} urgency=${parsed.urgency} mood=${data.mood}`,
      );

      return {
        reply: parsed.reply ?? "",
        aiData: {
          urgency: parsed.urgency ?? "medium",
          emotionalSummary: parsed.emotionalSummary ?? undefined,
          stressTriggers: Array.isArray(parsed.stressTriggers) ? parsed.stressTriggers : undefined,
          copingCards: Array.isArray(parsed.copingCards) ? parsed.copingCards : undefined,
          suggestTimer: parsed.suggestTimer === true ? true : undefined,
          exercise: parsed.mindfulnessExercise ?? undefined,
          moodCheckIn: parsed.moodCheckIn === true ? true : undefined,
          motivationalMessage: parsed.motivationalMessage ?? undefined,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[MindSpace] Ollama error →", msg);
      // Graceful degradation — AI down ≠ app broken.
      return getFallback(data.mood);
    }
  });
