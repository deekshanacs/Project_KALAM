# Tech Stack Decisions — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction

---

## 1. Core Framework

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `react` | `18.3.1` | UI framework | React 18 concurrent features, automatic batching |
| `react-dom` | `18.3.1` | DOM renderer | Paired with react |
| `@types/react` | `18.3.12` | TypeScript types | Strict typing for React APIs |
| `@types/react-dom` | `18.3.1` | TypeScript types | Strict typing for ReactDOM APIs |

---

## 2. Build Tooling

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `vite` | `5.4.10` | Build tool + dev server | Fast HMR, native ESM, excellent TypeScript support |
| `@vitejs/plugin-react` | `4.3.3` | React plugin for Vite | Babel-based fast refresh |
| `typescript` | `5.6.3` | TypeScript compiler | Strict mode, latest features |

**vite.config.ts key settings**:
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
```

**tsconfig.json key settings**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 3. Styling

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `tailwindcss` | `3.4.14` | Utility-first CSS | Rapid UI development, dark mode support |
| `@tailwindcss/forms` | `0.5.9` | Form styles plugin | Consistent form element styling |
| `autoprefixer` | `10.4.20` | CSS vendor prefixes | Cross-browser compatibility |
| `postcss` | `8.4.47` | CSS processing | Required by Tailwind |

**tailwind.config.ts key settings**:
```typescript
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable colors
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... other shadcn/ui color tokens
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```

---

## 4. UI Components (shadcn/ui + Radix UI)

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `@radix-ui/react-dialog` | `1.1.2` | Modal/Dialog primitive | Accessible, headless |
| `@radix-ui/react-dropdown-menu` | `2.1.2` | Dropdown menus | Accessible, keyboard navigable |
| `@radix-ui/react-tooltip` | `1.1.3` | Tooltips | Accessible hover tooltips |
| `@radix-ui/react-popover` | `1.1.2` | Popovers | For notification dropdown |
| `@radix-ui/react-select` | `2.1.2` | Select inputs | Accessible select component |
| `@radix-ui/react-avatar` | `1.1.1` | Avatar primitive | Base for Avatar component |
| `@radix-ui/react-progress` | `1.1.0` | Progress bar primitive | Base for WorkloadBar |
| `@radix-ui/react-separator` | `1.1.0` | Divider lines | Layout separators |
| `@radix-ui/react-label` | `2.1.0` | Form labels | Accessible form labels |
| `@radix-ui/react-slot` | `1.1.0` | Slot primitive | Used by shadcn/ui Button |
| `class-variance-authority` | `0.7.0` | Component variants | shadcn/ui variant system |
| `clsx` | `2.1.1` | Class merging | Conditional class names |
| `tailwind-merge` | `2.5.4` | Tailwind class merging | Prevents class conflicts |
| `lucide-react` | `0.454.0` | Icon library | Consistent, tree-shakeable icons |

**Note**: shadcn/ui components are copied into `src/components/ui/` via the shadcn CLI and are not npm dependencies themselves. The Radix UI primitives above are the actual npm packages.

---

## 5. Animation

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `framer-motion` | `11.11.11` | Animation library | Declarative animations, layout animations, gesture support |

**Key Framer Motion features used in Unit 5**:
- `motion.div` for page transitions
- `AnimatePresence` for exit animations
- `useReducedMotion()` for accessibility
- `animate` prop for sidebar width transition
- `variants` for reusable animation configs

---

## 6. HTTP Client

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `axios` | `1.7.7` | HTTP client | Interceptors, request/response transformation, TypeScript support |

---

## 7. Real-Time

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `socket.io-client` | `4.8.1` | WebSocket client | Matches backend Socket.io server version |

---

## 8. Charts

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `recharts` | `2.13.3` | Chart library | React-native, composable, responsive containers |

---

## 9. Routing

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `react-router-dom` | `6.27.0` | Client-side routing | Industry standard, nested routes, data loaders |

---

## 10. Notifications

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `react-hot-toast` | `2.4.1` | Toast notifications | Lightweight, accessible, customizable |

---

## 11. Form Handling & Validation

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `react-hook-form` | `7.53.2` | Form state management | Performant, minimal re-renders |
| `@hookform/resolvers` | `3.9.1` | Zod integration for RHF | Connects Zod schemas to react-hook-form |
| `zod` | `3.23.8` | Schema validation | TypeScript-first, composable schemas |

---

## 12. Testing

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `fast-check` | `3.22.0` | Property-based testing | TypeScript-native PBT framework |
| `vitest` | `2.1.4` | Test runner | Vite-native, fast, Jest-compatible API |
| `@vitest/ui` | `2.1.4` | Test UI | Visual test runner |
| `@testing-library/react` | `16.0.0` | Component testing | DOM-based testing utilities |
| `@testing-library/user-event` | `14.5.2` | User interaction simulation | Realistic user event simulation |
| `@testing-library/jest-dom` | `6.6.3` | DOM matchers | Extended Jest/Vitest matchers |
| `jsdom` | `25.0.1` | DOM environment | Browser-like environment for tests |
| `msw` | `2.6.0` | API mocking | Mock Service Worker for integration tests |

---

## 13. Development Tools

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `eslint` | `9.13.0` | Linting | Code quality enforcement |
| `@typescript-eslint/eslint-plugin` | `8.12.2` | TypeScript ESLint rules | TypeScript-specific linting |
| `@typescript-eslint/parser` | `8.12.2` | TypeScript ESLint parser | Parse TypeScript for ESLint |
| `eslint-plugin-react-hooks` | `5.0.0` | React hooks rules | Enforce hooks rules |
| `eslint-plugin-react-refresh` | `0.4.14` | Vite HMR rules | Ensure HMR compatibility |
| `prettier` | `3.3.3` | Code formatting | Consistent code style |

---

## 14. Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:pbt": "vitest run --reporter=verbose src/**/*.pbt.test.ts"
  }
}
```

---

## 15. Version Pinning Strategy

All packages use exact version pinning (no `^` or `~` prefixes) in `package.json` to ensure reproducible builds. The `package-lock.json` is committed to the repository.

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "axios": "1.7.7",
    "framer-motion": "11.11.11",
    "recharts": "2.13.3",
    "react-router-dom": "6.27.0",
    "socket.io-client": "4.8.1",
    "react-hot-toast": "2.4.1",
    "react-hook-form": "7.53.2",
    "zod": "3.23.8",
    "lucide-react": "0.454.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.4",
    "class-variance-authority": "0.7.0"
  },
  "devDependencies": {
    "vite": "5.4.10",
    "@vitejs/plugin-react": "4.3.3",
    "typescript": "5.6.3",
    "tailwindcss": "3.4.14",
    "fast-check": "3.22.0",
    "vitest": "2.1.4",
    "@testing-library/react": "16.0.0",
    "@testing-library/user-event": "14.5.2"
  }
}
```
