import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base "/internal-console/" é necessário porque o GitHub Pages serve este
// projeto em https://<usuario>.github.io/internal-console/, não na raiz.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/internal-console/" : "/",
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
}));
