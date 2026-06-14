import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// StudyForge dev server. Honors the PORT env var (falls back to 5180) so it can
// run alongside sibling projects without colliding.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5180,
  },
})
