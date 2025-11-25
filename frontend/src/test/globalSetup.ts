// Global setup that runs once before all tests
// This ensures localStorage is available before MSW loads

export function setup() {
  // Set up localStorage mock in the global scope before any tests run
  if (typeof globalThis.localStorage === "undefined") {
    const storage: Record<string, string> = {};
    const localStorageMock: Storage = {
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
    // @ts-expect-error - globalThis.localStorage might not be defined in Node
    globalThis.localStorage = localStorageMock;
  }
}

export function teardown() {
  // Cleanup if needed
}
