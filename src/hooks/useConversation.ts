import { useCallback, useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api/chat.server";
import {
  type AIData,
  type Message,
  type Thread,
  createThread,
  getThread,
  loadThreads,
  saveThreads,
  uid,
  upsertThread,
} from "@/lib/mindspace-store";

export type ConversationApi = {
  thread: Thread;
  messages: Message[];
  aiData: AIData | null;
  isLoading: boolean;
  error: string | null;
  mood: number | null;
  examType: string | null;
  sessionStarted: boolean;
  startSession: (args: {
    initialJournal: string;
    selectedMood: number;
    selectedExam: string;
  }) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  updateMood: (newMood: number) => Promise<void>;
  setMood: (m: number) => void;
  retry: () => Promise<void>;
};

// Thin wrapper so sendToAI has a consistent call shape regardless of
// whether we are in SSR or client context.
async function callOllamaCloud(payload: {
  message: string;
  mood: number | null;
  examType: string | null;
  history: Message[];
}): Promise<{ reply: string; aiData: AIData }> {
  // sendChatMessage is a TanStack Start server function — it handles the
  // Ollama API call server-side and returns a plain serializable object.
  const result = await sendChatMessage({
    data: {
      message: payload.message,
      mood: payload.mood ?? undefined,
      examType: payload.examType ?? undefined,
      history: payload.history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          text: m.text,
        })),
    },
  });
  return {
    reply: result.reply,
    aiData: result.aiData as AIData,
  };
}

export function useConversation(threadId: string): ConversationApi {
  // Always work against the latest thread from storage.
  const [thread, setThread] = useState<Thread>(() => {
    const existing = getThread(threadId);
    if (existing) return existing;
    const t = createThread();
    t.id = threadId;
    upsertThread(t);
    return t;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserRef = useRef<string | null>(null);

  // Sync to storage whenever thread changes.
  useEffect(() => {
    upsertThread(thread);
  }, [thread]);

  // If threadId switches (route change), reload.
  useEffect(() => {
    const t = getThread(threadId);
    if (t) setThread(t);
  }, [threadId]);

  const persistAndSet = useCallback((updater: (t: Thread) => Thread) => {
    setThread((prev) => {
      const next = updater(prev);
      next.updatedAt = Date.now();
      return next;
    });
  }, []);

  const callApi = useCallback(
    async (payload: {
      message: string;
      mood: number | null;
      examType: string | null;
      history: Message[];
    }): Promise<{ reply: string; aiData: AIData }> => {
      return callOllamaCloud(payload);
    },
    [],
  );

  const startSession = useCallback(
    async ({
      initialJournal,
      selectedMood,
      selectedExam,
    }: {
      initialJournal: string;
      selectedMood: number;
      selectedExam: string;
    }) => {
      setError(null);
      setIsLoading(true);

      const userMsg: Message = {
        id: uid(),
        role: "user",
        text: initialJournal,
        ts: Date.now(),
      };

      persistAndSet((t) => ({
        ...t,
        title: initialJournal.slice(0, 40) || "New session",
        examType: selectedExam,
        mood: selectedMood,
        sessionStarted: true,
        messages: [userMsg],
      }));
      lastUserRef.current = initialJournal;

      try {
        const { reply, aiData } = await callApi({
          message: initialJournal,
          mood: selectedMood,
          examType: selectedExam,
          history: [],
        });
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          text: reply,
          ts: Date.now(),
          ai: aiData,
        };
        persistAndSet((t) => ({ ...t, messages: [...t.messages, aiMsg] }));
      } catch (e: any) {
        // The server function has its own fallback, but if the RPC itself
        // fails (network partition, dev server down) we show an error.
        setError(
          "Couldn't connect to MindSpace. Please check your connection and try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, persistAndSet],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setError(null);
      setIsLoading(true);
      const userMsg: Message = {
        id: uid(),
        role: "user",
        text: trimmed,
        ts: Date.now(),
      };
      persistAndSet((t) => ({ ...t, messages: [...t.messages, userMsg] }));
      lastUserRef.current = trimmed;

      try {
        const history = thread.messages;
        const { reply, aiData } = await callApi({
          message: trimmed,
          mood: thread.mood,
          examType: thread.examType,
          history,
        });
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          text: reply,
          ts: Date.now(),
          ai: aiData,
        };
        persistAndSet((t) => ({ ...t, messages: [...t.messages, aiMsg] }));
      } catch (e: any) {
        setError("Couldn't send message. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, persistAndSet, thread],
  );

  const updateMood = useCallback(
    async (newMood: number) => {
      persistAndSet((t) => ({ ...t, mood: newMood }));
      await sendMessage(`(Mood update) I'm now at ${newMood}/10.`);
    },
    [persistAndSet, sendMessage],
  );

  const setMood = useCallback(
    (m: number) => {
      persistAndSet((t) => ({ ...t, mood: m }));
    },
    [persistAndSet],
  );

  const retry = useCallback(async () => {
    if (lastUserRef.current) await sendMessage(lastUserRef.current);
  }, [sendMessage]);

  const lastAi = [...thread.messages].reverse().find((m) => m.role === "assistant");

  return {
    thread,
    messages: thread.messages,
    aiData: lastAi?.ai ?? null,
    isLoading,
    error,
    mood: thread.mood,
    examType: thread.examType,
    sessionStarted: thread.sessionStarted,
    startSession,
    sendMessage,
    updateMood,
    setMood,
    retry,
  };
}

export function useThreadList() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());

  // Refresh from storage on mount and when window regains focus.
  useEffect(() => {
    const refresh = () => setThreads(loadThreads());
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const remove = (id: string) => {
    const next = loadThreads().filter((t) => t.id !== id);
    saveThreads(next);
    setThreads(next);
  };

  return { threads, refresh: () => setThreads(loadThreads()), remove };
}
