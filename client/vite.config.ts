import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['framer-motion', 'xlsx'],
    exclude: ['lucide-react'],
  },
  build: {
    /** Main bundle includes admin + charts; ~2.5MB vendor is expected until more code-splitting */
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Large UI/utility libs
          if (id.includes('node_modules/framer-motion/')) return 'framer-motion';
          if (id.includes('node_modules/lucide-react/')) return 'lucide-react';
          if (id.includes('node_modules/xlsx/')) return 'xlsx';
          if (id.includes('node_modules/zustand/')) return 'zustand';
          if (id.includes('node_modules/axios/')) return 'axios';
          if (id.includes('node_modules/socket.io-client/')) return 'socket-io';

          // Fallback: group the rest of vendors
          return 'vendor';
        },
      },
    },
  },
  server: {
    fs: {
      strict: false
    }
  }
});
