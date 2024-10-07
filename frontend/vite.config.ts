import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:5000', // Docker service name and port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
