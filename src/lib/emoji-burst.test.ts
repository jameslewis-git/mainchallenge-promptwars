import { describe, it, expect, vi, beforeEach } from "vitest";

const mockElement = {
  className: "",
  textContent: "",
  setAttribute: vi.fn(),
  style: {
    left: "",
    top: "",
    transform: "",
    setProperty: vi.fn(),
    animationDelay: "",
  },
  remove: vi.fn(),
};

const mockDocument = {
  createElement: vi.fn().mockReturnValue(mockElement),
  body: {
    appendChild: vi.fn(),
  },
};

global.document = mockDocument as unknown as Document;
global.window = {
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
} as unknown as Window & typeof globalThis;

import { emojiBurst, emojiBurstFromEvent } from "./emoji-burst";

describe("Emoji Burst Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do nothing if prefers-reduced-motion is true", () => {
    vi.mocked(global.window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    emojiBurst("✨", 100, 100);
    expect(mockDocument.createElement).not.toHaveBeenCalled();
  });

  it("should create elements and append to body when motion is allowed", () => {
    vi.mocked(global.window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    emojiBurst("❤️", 150, 200, 3);
    
    expect(mockDocument.createElement).toHaveBeenCalledTimes(3);
    expect(mockDocument.body.appendChild).toHaveBeenCalledTimes(3);
    expect(mockElement.textContent).toBe("❤️");
    expect(mockElement.style.left).toBe("150px");
    expect(mockElement.style.top).toBe("200px");
  });

  it("should burst emojis from a mouse event", () => {
    vi.mocked(global.window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    const mockEvent = { clientX: 300, clientY: 400 };
    emojiBurstFromEvent("🔥", mockEvent);

    expect(mockDocument.createElement).toHaveBeenCalled();
    expect(mockElement.style.left).toBe("300px");
    expect(mockElement.style.top).toBe("400px");
  });
});
