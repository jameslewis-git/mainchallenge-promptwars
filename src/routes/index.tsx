import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/auth-store";

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
    if (isAuthenticated()) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm" style={{ color: "#A8B2C8" }}>
      Loading MindSpace…
    </div>
  );
}
