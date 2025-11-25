// Polyfills for MSW - must be imported before any MSW imports
// MSW's CookieStore requires localStorage.getItem at module initialization

if (typeof globalThis.localStorage === "undefined") {
  const storage: Record<string, string> = {};
  (globalThis as Record<string, unknown>).localStorage = {
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
}
