// Note: preload.ts runs before this file to set up global mocks (localStorage, etc.)
// This is required because MSW needs localStorage available at module load time

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Reset after each test to ensure test isolation
afterEach(() => {
  cleanup();
  // Clear localStorage between tests (safely check for clear method)
  if (globalThis.localStorage && typeof globalThis.localStorage.clear === "function") {
    globalThis.localStorage.clear();
  }
});

// Note: MSW server is NOT automatically started here to avoid module loading issues.
// Tests that need API mocking should import and start the server explicitly:
//
// import { server } from "@/test/mocks/server";
// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
