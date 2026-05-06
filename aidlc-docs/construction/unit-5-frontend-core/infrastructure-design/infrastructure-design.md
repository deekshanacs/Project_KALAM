# Infrastructure Design — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction

---

## 1. Vite Development Server

### 1.1 Dev Server Configuration

The Vite dev server runs on `http://localhost:5173` by default. It proxies API and Socket.io requests to the backend to avoid CORS issues during development.

```typescript
// vite.config.ts
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
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the backend
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.io WebSocket connections
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // disable in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'chart-vendor': ['recharts'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
  },
});
```

### 1.2 Why Proxy?

In development, the frontend runs on port 5173 and the backend on port 4000. Without a proxy:
- Browser blocks cross-origin requests (CORS).
- Socket.io WebSocket upgrade fails.

The Vite proxy forwards requests transparently, making the frontend behave as if the API is on the same origin.

**In production**: The frontend is deployed to Vercel (static CDN) and the backend to Railway/Render. CORS is configured on the backend to allow the Vercel domain. No proxy needed.

---

## 2. Environment Variables

### 2.1 Variable Definitions

```bash
# frontend/.env.example

# Backend API base URL (no trailing slash)
# Development: http://localhost:4000
# Production: https://your-backend.railway.app
VITE_API_URL=http://localhost:4000

# Socket.io server URL
# Development: http://localhost:4000
# Production: https://your-backend.railway.app
VITE_SOCKET_URL=http://localhost:4000
```

### 2.2 Variable Usage in Code

```typescript
// Access via import.meta.env (Vite's env variable system)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: accessToken },
});
```

### 2.3 Variable Validation on Startup

```typescript
// src/utils/env.ts
const requiredEnvVars = ['VITE_API_URL', 'VITE_SOCKET_URL'] as const;

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy frontend/.env.example to frontend/.env and fill in the values.'
    );
  }
};

// Called in src/main.tsx before rendering
validateEnv();
```

### 2.4 Security Note

`VITE_` prefixed variables are embedded in the JavaScript bundle at build time. They are visible to anyone who inspects the bundle. Only public URLs (not secrets) should be in `VITE_` variables.

---

## 3. Build Output

### 3.1 Build Command

```bash
npm run build
# Equivalent to: tsc -b && vite build
```

### 3.2 Output Directory

```
frontend/dist/
├── index.html              # Entry point (SPA shell)
├── assets/
│   ├── index-[hash].js     # Main application bundle
│   ├── react-vendor-[hash].js
│   ├── ui-vendor-[hash].js
│   ├── chart-vendor-[hash].js
│   ├── socket-vendor-[hash].js
│   └── index-[hash].css    # Compiled Tailwind CSS
└── favicon.ico
```

### 3.3 Build Optimization

- **Tree shaking**: Vite/Rollup removes unused exports.
- **Code splitting**: Manual chunks defined in `vite.config.ts` for vendor libraries.
- **CSS purging**: Tailwind removes unused utility classes in production.
- **Minification**: Vite uses esbuild for JS minification (fast) and cssnano for CSS.
- **Gzip**: Vercel automatically serves gzip/brotli compressed assets.

---

## 4. Tailwind CSS Configuration

### 4.1 Content Paths (Purge Configuration)

```typescript
// tailwind.config.ts
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Include shadcn/ui component files
    './src/components/ui/**/*.{ts,tsx}',
  ],
  // ...
};
```

**Why this matters**: Tailwind scans these files to find all used utility classes. Classes not found in these files are removed from the production CSS bundle, reducing CSS size from ~3MB to ~10-50KB.

### 4.2 PostCSS Configuration

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## 5. TypeScript Configuration

### 5.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5.2 tsconfig.node.json (for Vite config)

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## 6. ESLint Configuration

```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
```

---

## 7. Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

## 8. Monorepo Integration

### 8.1 Shared Types Import

```typescript
// frontend/src/types/index.ts
// Re-export all shared types from the monorepo shared package
export * from '../../shared/types/index';
```

### 8.2 Workspace Configuration

```json
// Root package.json (monorepo root)
{
  "workspaces": ["frontend", "backend", "shared"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "build:frontend": "npm run build --workspace=frontend",
    "test:frontend": "npm run test --workspace=frontend"
  }
}
```
