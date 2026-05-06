# NFR Requirements — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction  
**Security Baseline**: ENABLED  
**PBT Extension**: ENABLED

---

## 1. Performance Requirements

### NFR-U5-PERF-01: Initial Page Load
- **Requirement**: Initial page load (first contentful paint) MUST be < 3 seconds on a standard broadband connection.
- **Measurement**: Lighthouse performance score > 80.
- **Implementation strategies**:
  - Vite code splitting: each page is a lazy-loaded chunk (`React.lazy` + `Suspense`).
  - Tailwind CSS purge removes unused styles in production build.
  - shadcn/ui components are tree-shaken.
  - Images use `loading="lazy"` attribute.
  - Fonts loaded with `font-display: swap`.

### NFR-U5-PERF-02: Dashboard Chart Render Time
- **Requirement**: Dashboard charts MUST render within 500ms of data being available.
- **Measurement**: Time from `setDashboardData()` call to chart visible in DOM.
- **Implementation**: Recharts `<ResponsiveContainer>` with memoized data arrays. Chart data transformations done in `useMemo`.

### NFR-U5-PERF-03: Token Refresh Transparency
- **Requirement**: Token refresh MUST be transparent to the user — no visible loading state, no interrupted UX.
- **Measurement**: User does not see a redirect to `/login` or a loading spinner during refresh.
- **Implementation**: Axios interceptor queues requests during refresh; user sees at most a brief delay in the original request completing.

### NFR-U5-PERF-04: Bundle Size
- **Requirement**: Initial JS bundle MUST be < 500KB gzipped.
- **Implementation**: Route-based code splitting, dynamic imports for heavy libraries (Recharts, Framer Motion loaded per-page).

### NFR-U5-PERF-05: Animation Performance
- **Requirement**: All Framer Motion animations MUST run at 60fps.
- **Implementation**: Use `transform` and `opacity` properties only (GPU-accelerated). Avoid animating `width`, `height`, or `margin` directly.

---

## 2. Security Requirements

### NFR-U5-SEC-04: Content Security Policy (SECURITY-04)
- **Requirement**: A Content Security Policy MUST be set via `<meta http-equiv="Content-Security-Policy">` in `index.html`.
- **Minimum policy**:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' {VITE_API_URL} {VITE_SOCKET_URL} wss:;
  font-src 'self';
  frame-src 'none';
  object-src 'none';
  ```
- **Note**: `'unsafe-inline'` for styles is required by Tailwind CSS inline styles. Evaluate stricter CSP in future iterations.

### NFR-U5-SEC-08: Route Guards (SECURITY-08)
- **Requirement**: ALL routes except `/login` and `/register` MUST be protected by `<PrivateRoute>`.
- **Verification**: No protected page renders without a valid `accessToken` in AuthContext.
- **Implementation**: `<PrivateRoute>` component wrapping all protected routes in the router configuration.

### NFR-U5-SEC-09: No API Keys in Frontend Bundle (SECURITY-09)
- **Requirement**: No backend API keys, database credentials, or secrets MUST appear in the frontend bundle.
- **Verification**: `grep -r "ANTHROPIC\|DATABASE\|JWT_SECRET" dist/` returns no results.
- **Implementation**: Only `VITE_API_URL` and `VITE_SOCKET_URL` are exposed via `import.meta.env`. These are public URLs, not secrets.

### NFR-U5-SEC-12: Token Storage Limitation (SECURITY-12)
- **Requirement**: Document the localStorage refresh token limitation explicitly.
- **Documentation**: Code comment in `AuthContext.tsx`:
  ```typescript
  // SECURITY NOTE: refreshToken is stored in localStorage for MVP simplicity.
  // Production recommendation: migrate to httpOnly cookie set by the backend
  // to eliminate XSS risk on the refresh token.
  // See: SECURITY-12 in nfr-requirements.md
  ```
- **Mitigation**: Access token is in memory only (not localStorage), limiting XSS exposure window to 15 minutes.

### NFR-U5-SEC-XSS: XSS Prevention
- **Requirement**: No user-provided content MUST be rendered via `dangerouslySetInnerHTML` without sanitization.
- **Implementation**: In Unit 5, no user content is rendered as HTML. This rule is enforced in Unit 7 (chat messages).

---

## 3. Usability & Accessibility Requirements

### NFR-U5-UX-01: WCAG 2.1 AA Target
- **Requirement**: All Unit 5 components MUST target WCAG 2.1 AA compliance.
- **Key criteria**:
  - Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text.
  - All interactive elements keyboard accessible.
  - Focus indicators visible on all focusable elements.
  - No content relies solely on color to convey information.

### NFR-U5-UX-02: Keyboard Navigation
- **Requirement**: All interactive elements (buttons, links, inputs, dropdowns) MUST be reachable and operable via keyboard.
- **Tab order**: Logical tab order following visual layout.
- **Focus trap**: Modal dialogs and dropdowns MUST trap focus within them.
- **Escape key**: Closes all modals, dropdowns, and overlays.

### NFR-U5-UX-03: ARIA Labels
- **Requirement**: All interactive elements MUST have accessible names.
- **Implementation**:
  - Icon-only buttons: `aria-label="Collapse sidebar"`, `aria-label="Toggle notifications"`, etc.
  - Form inputs: associated `<label>` elements with `htmlFor`.
  - Status badges: `role="status"` + `aria-label`.
  - Progress bars: `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax`.
  - Navigation: `<nav aria-label="Main navigation">`.

### NFR-U5-UX-04: Reduced Motion
- **Requirement**: All animations MUST respect the `prefers-reduced-motion` media query.
- **Implementation**: Framer Motion `useReducedMotion()` hook; when true, disable or minimize animations.

### NFR-U5-UX-05: Loading States
- **Requirement**: All async operations MUST show a loading indicator.
- **Implementation**: Skeleton loaders for data fetching, spinner on submit buttons.

### NFR-U5-UX-06: Error States
- **Requirement**: All async operations MUST have an error state with a user-friendly message and retry option.
- **Implementation**: Error boundary + inline error states with retry buttons.

### NFR-U5-UX-07: Dark/Light Mode
- **Requirement**: All components MUST support both dark and light modes.
- **Implementation**: Tailwind `dark:` variants on all color classes. No hardcoded colors.

---

## 4. Maintainability Requirements

### NFR-U5-MAINT-01: Strict TypeScript
- **Requirement**: `strict: true` in `tsconfig.json`. No `any` types allowed.
- **Enforcement**: TypeScript compiler errors are blocking (CI fails on type errors).
- **ESLint rule**: `@typescript-eslint/no-explicit-any: error`.

### NFR-U5-MAINT-02: data-testid Attributes
- **Requirement**: All interactive elements and major UI sections MUST have `data-testid` attributes.
- **Convention**: kebab-case, descriptive, unique within page scope.
- **Purpose**: Enables reliable test selectors without coupling to CSS classes or DOM structure.

### NFR-U5-MAINT-03: Component Documentation
- **Requirement**: All exported components MUST have JSDoc comments describing their purpose and props.

### NFR-U5-MAINT-04: No Magic Numbers
- **Requirement**: All threshold values (workload percentages, notification limits, etc.) MUST be defined as named constants.
- **File**: `src/utils/constants.ts`.

### NFR-U5-MAINT-05: Consistent Import Paths
- **Requirement**: Use TypeScript path aliases (`@/`) for all internal imports.
- **Configuration**: `tsconfig.json` paths + `vite.config.ts` resolve aliases.
  ```json
  {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
  ```

---

## 5. Reliability Requirements

### NFR-U5-REL-01: Error Boundary
- **Requirement**: Each page MUST be wrapped in a React `ErrorBoundary` component.
- **Behavior**: Catches render errors, shows friendly error UI, logs to console in dev.

### NFR-U5-REL-02: Network Resilience
- **Requirement**: API calls MUST handle network errors gracefully (no unhandled promise rejections).
- **Implementation**: All API calls wrapped in try/catch; errors shown as toasts.

### NFR-U5-REL-03: Socket Reconnection
- **Requirement**: Socket.io client MUST automatically reconnect on disconnect.
- **Configuration**: Default Socket.io reconnection with exponential backoff.

---

## 6. Testing Requirements

### NFR-U5-TEST-01: Unit Tests
- **Requirement**: All utility functions (`getWorkloadColor`, `buildInitials`, `formatters`) MUST have unit tests.
- **Framework**: Vitest.

### NFR-U5-TEST-02: Component Tests
- **Requirement**: All CommonComponents MUST have component tests using `@testing-library/react`.
- **Coverage**: Render, props, interactions, accessibility.

### NFR-U5-TEST-03: PBT Tests
- **Requirement**: Business logic functions with numeric inputs MUST have property-based tests using `fast-check`.
- **Targets**: `getWorkloadColor`, notification array management, token serialization.
- **Rule**: PBT-08 — seed logging enabled in CI.

### NFR-U5-TEST-04: Auth Flow Integration Test
- **Requirement**: The login → token storage → protected route → token refresh → logout flow MUST have an integration test.
- **Framework**: Vitest + MSW (Mock Service Worker) for API mocking.
