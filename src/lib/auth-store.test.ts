import { describe, it, expect, beforeEach, vi } from "vitest";
import { login, logout, isAuthenticated, getUser, MOCK_CREDENTIALS } from "./auth-store";

// Mock storage and globals
const sessionStorageStore: Record<string, string> = {};
const mockSessionStorage = {
  getItem: (key: string) => sessionStorageStore[key] || null,
  setItem: (key: string, value: string) => { sessionStorageStore[key] = value.toString(); },
  removeItem: (key: string) => { delete sessionStorageStore[key]; },
  clear: () => {
    for (const key in sessionStorageStore) {
      delete sessionStorageStore[key];
    }
  },
};

global.sessionStorage = mockSessionStorage as unknown as Storage;
global.window = {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as Window & typeof globalThis;

describe("Auth Store Operations", () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  it("should not be authenticated initially", () => {
    expect(isAuthenticated()).toBe(false);
    expect(getUser()).toBeNull();
  });

  it("should authenticate with mock credentials", () => {
    const result = login(MOCK_CREDENTIALS.email, MOCK_CREDENTIALS.password);
    expect(result.ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
    expect(getUser()?.name).toBe(MOCK_CREDENTIALS.name);
    expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.any(Object));
  });

  it("should authenticate with custom credentials", () => {
    const result = login("user@test.com", "mypassword123", "Tester");
    expect(result.ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
    expect(getUser()?.name).toBe("Tester");
  });

  it("should fail authentication with invalid password length", () => {
    const result = login("user@test.com", "123");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(isAuthenticated()).toBe(false);
  });

  it("should clear session on logout", () => {
    login(MOCK_CREDENTIALS.email, MOCK_CREDENTIALS.password);
    expect(isAuthenticated()).toBe(true);
    
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getUser()).toBeNull();
  });
});
