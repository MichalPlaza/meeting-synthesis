// Ensure localStorage exists with proper methods before MSW loads
// MSW's CookieStore requires localStorage.getItem at module initialization
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  },
  key: (index: number) => Object.keys(storage)[index] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

// Check if localStorage exists AND has proper getItem method
if (
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage.getItem !== "function"
) {
  (globalThis as Record<string, unknown>).localStorage = localStorageMock;
}

// Now safe to import MSW
const { setupServer } = await import("msw/node");
const { handlers, errorHandlers } = await import("./handlers");

// Setup MSW server with default handlers
export const server = setupServer(...handlers);

// Re-export handlers for test customization
export { handlers, errorHandlers };
