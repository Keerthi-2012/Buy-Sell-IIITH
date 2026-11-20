import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Same-origin API calls in dev: no CORS, cookies just work.
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  // Component tests run in a fake browser (jsdom); CSS imports are skipped.
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: false,
  },
})
