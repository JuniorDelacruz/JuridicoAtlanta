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
    allowedHosts: [
      'subterete-chronometrical-haven.ngrok-free.dev',
      'juridicoatlanta.starkstore.dev.br'
    ],
    port: 3000, // opcional, como falamos antes
  },
})