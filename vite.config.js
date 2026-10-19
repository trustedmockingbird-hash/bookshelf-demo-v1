import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: env.GITHUB_ACTIONS === 'true' ? '/bookshelf-demo-v1/' : '/',
  plugins: [react()],
})
