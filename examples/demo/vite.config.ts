import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages'
const base = '/react-flip-page/'

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      // external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
  plugins: [react()],
})
