import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock globalThis.addEventListener before importing the module
const mockListeners: Record<string, ((event: any) => void)[]> = {};
globalThis.addEventListener = vi.fn().mockImplementation((event: string, callback: (event: any) => void) => {
  if (!mockListeners[event]) {
    mockListeners[event] = [];
  }
  mockListeners[event].push(callback);
});

let consumeLastCapturedError: () => unknown;

describe("Error Capture Utility", () => {
  beforeAll(async () => {
    // Dynamic import to ensure module runs after globalThis mocks are ready
    const mod = await import("./error-capture");
    consumeLastCapturedError = mod.consumeLastCapturedError;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("should return undefined initially", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("should capture and consume global errors", () => {
    const errorCallback = mockListeners["error"]?.[0];
    expect(errorCallback).toBeDefined();

    const mockError = new Error("Global Error Test");
    errorCallback({ error: mockError });

    // Should return the captured error
    expect(consumeLastCapturedError()).toBe(mockError);
    // Next check should clear and return undefined
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("should capture and consume unhandled rejections", () => {
    const rejectionCallback = mockListeners["unhandledrejection"]?.[0];
    expect(rejectionCallback).toBeDefined();

    const mockReason = "Promise Reject Reason";
    rejectionCallback({ reason: mockReason });

    expect(consumeLastCapturedError()).toBe(mockReason);
  });

  it("should discard error if TTL is expired", () => {
    const errorCallback = mockListeners["error"]?.[0];
    errorCallback({ error: new Error("Expired Error") });

    // Advance time by 6 seconds (TTL is 5 seconds)
    vi.advanceTimersByTime(6000);

    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
