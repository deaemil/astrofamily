import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const apiProxy = {
  "/api": `http://127.0.0.1:${process.env.ASTRO_API_PORT || "8000"}`,
};
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ["@supabase/supabase-js"],
          react: ["react", "react-dom"],
          csv: ["papaparse"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: apiProxy,
  },
  preview: { host: "0.0.0.0", proxy: apiProxy },
});
