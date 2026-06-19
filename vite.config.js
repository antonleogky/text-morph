import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// When deploying to GitHub Pages the site lives under /text-morph/.
// Set GITHUB_PAGES=true (build:pages) to emit the right base path.
const base = process.env.GITHUB_PAGES === 'true' ? '/text-morph/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5191 },
})
