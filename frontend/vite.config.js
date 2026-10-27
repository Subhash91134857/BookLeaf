import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api/* is proxied to the backend, so no CORS setup is needed locally.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': env.VITE_PROXY_TARGET || 'http://localhost:4000' } },
  };
});
