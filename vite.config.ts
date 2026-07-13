import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import base44 from "@base44/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    base44({
      legacySDKImports: false,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
    }),
  ],
  resolve: {
    alias: {
      "@/api/base44Client": path.resolve(__dirname, "./src/api/base44Client"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
