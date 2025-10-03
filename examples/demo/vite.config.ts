import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      // 将 react 和 react/jsx-runtime 标记为外部依赖
      external: ['react', 'react/jsx-runtime'],
      output: {
        // 如果你的库格式是 UMD 或 iife，可能需要提供全局变量名
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime', // 请注意这个全局变量名可能需要根据实际情况确定
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
