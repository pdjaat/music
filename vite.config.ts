import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api/audius": {
        target: "https://discoveryprovider.audius.co",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/audius/, "/v1"),
      },
      "/api/jamendo": {
        target: "https://api.jamendo.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/jamendo/, "/v3.0"),
      },
      "/api/archive": {
        target: "https://archive.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/archive/, ""),
      },
    },
  },
});
