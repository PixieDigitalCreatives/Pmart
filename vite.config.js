import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Automatically inject variables and mixins so components don't need manual imports every time
        additionalData: `@use "@/styles/variables" as *; @use "@/styles/mixins" as *; @use "@/styles/breakpoints" as *;`
      }
    }
  }
})
