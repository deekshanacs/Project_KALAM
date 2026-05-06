import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Resolve @tms/shared — works whether building from repo root or frontend/
const sharedFromFrontend = path.resolve(__dirname, '../shared/src/types/index.ts');
const sharedFromRoot = path.resolve(__dirname, 'shared/src/types/index.ts');
const sharedPath = fs.existsSync(sharedFromFrontend) ? sharedFromFrontend : sharedFromRoot;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tms/shared': sharedPath,
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
    ],
  },
});
