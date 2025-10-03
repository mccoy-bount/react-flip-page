import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'

export default defineConfig({
  input: 'src/index.ts', // 组件库入口文件
  output: {
    file: 'dist/index.esm.js', // 输出 ESM 文件
    format: 'esm', // ES Modules 格式
    sourcemap: true
  },
  plugins: [
    // 处理 CSS
    postcss({
      minimize: true,
      extract: 'style.css'
    }),
    // 解析 node_modules 中的模块
    nodeResolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }),
    // 将 CommonJS 模块转换为 ES6
    commonjs(),
    // 处理 TypeScript
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*']
    })
  ],
  // 外部化 React，不打包进组件库
  external: ['react', 'react-dom']
})
