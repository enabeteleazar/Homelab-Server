import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT ?? 5173);

// Données réelles : l'API de NexusTower (qui relaie aussi HomeboxServer, jeton côté serveur).
const proxy = {
  "/api": { target: process.env.TOWER_API ?? "http://127.0.0.1:8791", changeOrigin: true },
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy,
  },
  preview: {
    port: Number(process.env.PORT ?? 4173),
    host: "0.0.0.0",
    allowedHosts: true,
    proxy,
  },
});
