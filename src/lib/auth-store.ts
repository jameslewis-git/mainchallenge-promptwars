import { useState, useEffect } from "react";

const AUTH_KEY = "mindspace.auth.v1";

export type AuthUser = {
  email: string;
  name: string;
  avatar: string; // initials
  loginAt: number;
};

// Mock credentials
export const MOCK_CREDENTIALS = {
  email: "demo@mindspace.app",
  password: "mindspace2024",
  name: "Alex",
};

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return !!raw;
  } catch {
    return false;
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function login(email: string, password: string, name?: string): { ok: boolean; error?: string } {
  const e = email.trim().toLowerCase();
  const p = password;
  if (e === MOCK_CREDENTIALS.email && p === MOCK_CREDENTIALS.password) {
    const user: AuthUser = {
      email: e,
      name: MOCK_CREDENTIALS.name,
      avatar: MOCK_CREDENTIALS.name.slice(0, 2).toUpperCase(),
      loginAt: Date.now(),
    };
    try {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event("mindspace-auth-change"));
    } catch {/* storage unavailable */}
    return { ok: true };
  }

  // Accept other credentials to make signup/signin mock fully work
  if (e && p && p.length >= 6) {
    const defaultName = e.split("@")[0];
    const user: AuthUser = {
      email: e,
      name: name || defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
      avatar: (name || defaultName).slice(0, 2).toUpperCase(),
      loginAt: Date.now(),
    };
    try {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event("mindspace-auth-change"));
    } catch {/* storage unavailable */}
    return { ok: true };
  }

  return { ok: false, error: "Invalid credentials. Password must be at least 6 characters." };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event("mindspace-auth-change"));
  } catch {/* ignore */}
}

export function useMindSpaceAuth() {
  const [authTrigger, setAuthTrigger] = useState(0);

  useEffect(() => {
    const handler = () => {
      setAuthTrigger((t) => t + 1);
    };
    window.addEventListener("mindspace-auth-change", handler);
    return () => window.removeEventListener("mindspace-auth-change", handler);
  }, []);

  const isDemo = isAuthenticated();
  const demoUser = getUser();

  const isLoaded = true;
  const isSignedIn = isDemo;
  const user = isDemo && demoUser
    ? {
        name: demoUser.name,
        email: demoUser.email,
        avatar: demoUser.avatar,
      }
    : null;

  const signOut = async () => {
    logout();
  };

  return {
    isLoaded,
    isSignedIn,
    user,
    isDemo,
    signOut,
  };
}
