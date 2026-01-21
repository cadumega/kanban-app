import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use 'dist' for Vercel, '../backend/public' for local
const outDir = process.env.VERCEL ? 'dist' : '../backend/public'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
