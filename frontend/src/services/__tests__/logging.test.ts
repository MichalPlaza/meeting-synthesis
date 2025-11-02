import { describe, it, expect, vi, beforeEach } from "vitest";
import log from "@/services/logging";

describe("logging service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export logger instance", () => {
    expect(log).toBeDefined();
    expect(typeof log.debug).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");
  });

  it("should have trace method", () => {
    expect(typeof log.trace).toBe("function");
  });

  it("should allow setting log level", () => {
    const originalLevel = log.getLevel();

    log.setLevel("silent");
    expect(log.getLevel()).toBe(5); // silent level

    log.setLevel("debug");
    expect(log.getLevel()).toBe(1); // debug level

    // Restore original level
    log.setLevel(originalLevel);
  });

  it("should support all log levels", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.setLevel("trace");
    log.trace("trace message");
    log.debug("debug message");
    log.info("info message");
    log.warn("warn message");
    log.error("error message");

    spy.mockRestore();
  });
});
