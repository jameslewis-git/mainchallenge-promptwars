import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utility cn function", () => {
  it("should merge class names correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional class names", () => {
    const isTrue = true;
    const isFalse = false;
    const result = cn("base", isTrue && "active", isFalse && "hidden");
    expect(result).toBe("base active");
  });

  it("should merge Tailwind classes overrides correctly", () => {
    const result = cn("px-2 py-1", "p-4");
    // p-4 overrides/merges with px-2 and py-1 correctly
    expect(result).toBe("p-4");
  });
});
