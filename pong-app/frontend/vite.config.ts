import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs, { readFileSync } from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_HOST_IP || '0.0.0.0',
    allowedHosts: ['fttranscendence.duckdns.org'],
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'three': path.resolve(__dirname, 'node_modules/three')
    }
  }
})