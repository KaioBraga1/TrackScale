import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // usado quando VITE_META_MODE=http (ver server/index.mjs)
    proxy: { "/api": "http://localhost:8787" },
  },
});
