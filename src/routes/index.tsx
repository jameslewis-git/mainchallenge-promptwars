import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMindSpaceAuth } from "@/lib/auth-store";

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
  const { isSignedIn, isLoaded } = useMindSpaceAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm" style={{ color: "var(--soft-color)" }}>
      Initializing MindSpace Console…
    </div>
  );
}
