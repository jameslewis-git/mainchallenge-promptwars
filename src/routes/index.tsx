import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { createThread, loadThreads, upsertThread } from "@/lib/mindspace-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindSpace — Your calm in the chaos of exam prep" },
      {
        name: "description",
        content:
          "AI-powered mental wellness companion for Indian students preparing for NEET, JEE, CUET, CAT, GATE and UPSC.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const existing = loadThreads();
    const target = existing[0]?.id ?? (() => {
      const t = createThread();
      upsertThread(t);
      return t.id;
    })();
    navigate({ to: "/chat/$threadId", params: { threadId: target }, replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm" style={{ color: "#A8B2C8" }}>
      Loading MindSpace…
    </div>
  );
}
