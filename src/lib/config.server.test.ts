import { describe, it, expect } from "vitest";
import { getServerConfig } from "./config.server";

describe("Server Config Utility", () => {
  it("should return the server configuration", () => {
    const config = getServerConfig();
    expect(config).toBeDefined();
    expect(config).toHaveProperty("nodeEnv");
  });
});
