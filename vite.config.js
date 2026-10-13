import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The dev server proxies the REST API and Socket.IO to the backend so the browser only talks to one origin.
// Override the target with PMART_API_TARGET (e.g. http://localhost:5003) when the backend uses another port.
const apiTarget = process.env.PMART_API_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'jesse-quotations-gospel-accessory.trycloudflare.com'
    ],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Prepends the shared tokens to every SCSS file. A UTF-8 BOM at the start of a file would end up after
        // this prefix and silently break the file's first selector, so strip it.
        additionalData: (source) =>
          `@use "sass:color"; @use "@/styles/variables" as *; @use "@/styles/mixins" as *; @use "@/styles/breakpoints" as *;\n${source.replace(/^﻿/, '')}`
      }
    }
  }
})
