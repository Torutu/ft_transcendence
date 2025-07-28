// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import path from 'path'
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     port: 5173,
//   },
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//       'three': path.resolve(__dirname, 'node_modules/three')
//     }
//   }
// })
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://localhost:3000',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, '')
//       }
//     }
//   }
// });
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import { fileURLToPath } from 'url';
// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       '@': fileURLToPath(new URL('./src', import.meta.url))
//     }
//   },
//   server: {
//     host: true,
//     port: 5173,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:3000',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, '')
//       }
//     }
//   }
// });
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
});
