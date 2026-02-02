import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'ES2022',
    commonjsOptions: {
      include: [/ethers/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  esbuild: {
    loader: 'tsx',
  },
  optimizeDeps: {
    include: ['ethers'],
    exclude: ['@base-org/account'],
    esbuildOptions: {
      loader: {
        '.js': 'tsx',
        '.ts': 'tsx',
        '.tsx': 'tsx',
      },
      target: 'ES2022',
    },
  },
})  