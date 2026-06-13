import { describe, it, expect, vi } from "vitest";

const mockCaptureException = vi.fn();
global.window = {
  location: {
    pathname: "/test-route",
  },
  __lovableEvents: {
    captureException: mockCaptureException,
  },
} as unknown as Window & typeof globalThis;

import { reportLovableError } from "./lovable-error-reporting";

describe("Lovable Error Reporting Utility", () => {
  it("should capture exception when window.__lovableEvents is defined", () => {
    const error = new Error("Sample Error");
    reportLovableError(error, { extra: "data" });

    expect(mockCaptureException).toHaveBeenCalledWith(
      error,
      {
        source: "react_error_boundary",
        route: "/test-route",
        extra: "data",
      },
      {
        mechanism: "react_error_boundary",
        handled: false,
        severity: "error",
      }
    );
  });
});
