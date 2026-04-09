import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'

// https://vite.dev/config/
export default defineConfig({
  css: {
    postcss: {
      plugins: [postcssCascadeLayers()],
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
      '/health': { target: 'http://localhost:3333', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3333', ws: true },
      '/uploads': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
})
