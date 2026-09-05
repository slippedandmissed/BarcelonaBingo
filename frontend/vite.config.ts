import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";

dotenv.config();

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": process.env.PROXY_SERVER_TARGET!,
    },
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
});
