import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function removeCSSLayers(): Plugin {
  return {
    name: 'remove-css-layers',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && typeof chunk.source === 'string' && chunk.fileName.endsWith('.css')) {
          chunk.source = unwrapLayers(chunk.source)
        }
      }
    },
  }
}

function unwrapLayers(css: string): string {
  let result = ''
  let i = 0
  while (i < css.length) {
    const idx = css.indexOf('@layer', i)
    if (idx === -1) { result += css.slice(i); break }
    result += css.slice(i, idx)
    const afterLayer = idx + 6
    const brace = css.indexOf('{', afterLayer)
    const semi = css.indexOf(';', afterLayer)
    if (semi !== -1 && (brace === -1 || semi < brace)) {
      i = semi + 1
    } else if (brace !== -1) {
      let depth = 0
      let j = brace
      while (j < css.length) {
        if (css[j] === '{') depth++
        else if (css[j] === '}') { depth--; if (depth === 0) break }
        j++
      }
      result += css.slice(brace + 1, j)
      i = j + 1
    } else {
      result += '@layer'
      i = afterLayer
    }
  }
  return result
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), removeCSSLayers()],
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
