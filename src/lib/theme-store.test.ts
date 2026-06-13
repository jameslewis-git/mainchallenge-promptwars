import { describe, it, expect, beforeEach, vi } from "vitest";

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value.toString(); },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => {
    for (const key in localStorageStore) {
      delete localStorageStore[key];
    }
  },
};

const mockDocumentElement = {
  setAttribute: vi.fn(),
  classList: {
    toggle: vi.fn(),
  },
};

global.window = {} as unknown as Window & typeof globalThis;
global.localStorage = mockLocalStorage as unknown as Storage;
global.document = {
  documentElement: mockDocumentElement,
} as unknown as Document;

// Import after setting up mocks
import { themeStore } from "./theme-store";

describe("Theme Store Operations", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it("should get initial default theme", () => {
    expect(themeStore.getTheme()).toBe("dark");
  });

  it("should update theme and persist in localStorage", () => {
    themeStore.setTheme("light");
    expect(themeStore.getTheme()).toBe("light");
    expect(mockLocalStorage.getItem("theme")).toBe("light");
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(mockDocumentElement.classList.toggle).toHaveBeenCalledWith("light", true);
  });

  it("should trigger subscription listeners on change", () => {
    themeStore.setTheme("dark"); // Ensure starting state is dark
    
    const listener = vi.fn();
    const unsubscribe = themeStore.subscribe(listener);

    themeStore.setTheme("dark"); // No change, shouldn't fire
    expect(listener).not.toHaveBeenCalled();

    themeStore.setTheme("light");
    expect(listener).toHaveBeenCalledWith("light");

    unsubscribe();
  });
});
