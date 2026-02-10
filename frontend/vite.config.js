// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // <- Isso ativa o Tailwind v4 automaticamente
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "wss",
      host: "juridicoatlanta.starkstore.dev.br",
      clientPort: 443,
    }
  },
  build: {
    sourcemap: false
  }
})