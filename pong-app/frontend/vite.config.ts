import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseTlsPath = process.env.TLS_PATH || path.join(__dirname, "../tls");

const httpsOptions = {
  key: fs.readFileSync(path.join(baseTlsPath, "key.pem")),
  cert: fs.readFileSync(path.join(baseTlsPath, "cert.pem")),
};

export default defineConfig(({ mode }) => {
  // Load env variables based on the current mode (e.g., 'development' or 'production')
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      https: httpsOptions,
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false, // Set to true only if using a trusted cert
        },
        '/socket.io': {
          target: env.VITE_API_URL,
          ws: true,
          changeOrigin: true,
          secure: false,
        }  
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'three': path.resolve(__dirname, 'node_modules/three'),
      },
    },
  };
});
