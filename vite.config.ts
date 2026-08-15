import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Forwards to `server/` (npm run dev in server/, http://localhost:3000)
      // so the copilot can call relative `/api/*` paths in both dev and prod.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Modern baseline (all evergreen browsers) — smaller, less-polyfilled
    // output than the default esbuild target.
    target: 'es2020',
    // No source maps in the shipped bundle — smaller artifact, doesn't
    // expose original source. Run `vite build --sourcemap` locally when
    // debugging a production build instead.
    sourcemap: false,
    // manualChunks below keeps every chunk comfortably under this.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code from app code so browsers can
        // cache the vendor chunk across deploys, and give the
        // Recruiter Copilot's heavier dependencies (framer-motion,
        // lucide-react) their own chunks. React.lazy() in App.tsx is what
        // defers *fetching* the copilot until it mounts; this just keeps
        // its code out of the main vendor chunk once it is fetched.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
