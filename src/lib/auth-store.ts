import { useAuth, useUser, useClerk } from "@clerk/tanstack-react-start";

const AUTH_KEY = "mindspace.auth.v1";

export type AuthUser = {
  email: string;
  name: string;
  avatar: string; // initials
  loginAt: number;
};

// Mock credentials — swap these for real auth later
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

export function login(email: string, password: string): { ok: boolean; error?: string } {
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
    } catch {/* storage unavailable */}
    return { ok: true };
  }
  return { ok: false, error: "Invalid credentials. Try demo@mindspace.app / mindspace2024" };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {/* ignore */}
}

export function useMindSpaceAuth() {
  const clerkAuth = useAuth();
  const clerkUser = useUser();
  const clerk = useClerk();

  const isDemo = isAuthenticated();
  const demoUser = getUser();

  const isLoaded = clerkAuth.isLoaded;
  const isSignedIn = !!clerkAuth.isSignedIn || isDemo;

  const user = clerkAuth.isSignedIn && clerkUser.user
    ? {
        name: clerkUser.user.fullName || clerkUser.user.username || "User",
        email: clerkUser.user.primaryEmailAddress?.emailAddress || "",
        avatar: clerkUser.user.imageUrl || "U",
      }
    : isDemo && demoUser
    ? {
        name: demoUser.name,
        email: demoUser.email,
        avatar: demoUser.avatar,
      }
    : null;

  const signOut = async () => {
    logout();
    if (clerkAuth.isSignedIn) {
      await clerk.signOut();
    }
  };

  return {
    isLoaded,
    isSignedIn,
    user,
    isDemo,
    signOut,
  };
}
