import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Required for pnpm
  server: {
    port: 3000,
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    include: ["@/**"],
  },
});
