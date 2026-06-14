import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// StudyForge dev server. Honors the PORT env var (falls back to 5180) so it can
// run alongside sibling projects without colliding. /api/* is proxied to the
// local progress API (Express + SQLite) on port 5182.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5180,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 5182}`,
        changeOrigin: true,
      },
    },
  },
})
