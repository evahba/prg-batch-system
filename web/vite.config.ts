import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import postcssOklabFunction from '@csstools/postcss-oklab-function'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'
import postcssColorMixFunction from '@csstools/postcss-color-mix-function'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [
        postcssCascadeLayers(),
        postcssColorMixFunction({ preserve: true }),
        postcssOklabFunction({ preserve: true }),
      ],
    },
  },
  build: {
    target: 'chrome105',
  },
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
