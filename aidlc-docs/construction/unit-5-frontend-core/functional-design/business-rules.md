# Business Rules — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction  
**Security Baseline**: ENABLED (all 15 rules enforced)  
**PBT Extension**: ENABLED (all 10 rules enforced)

---

## 1. Token Storage Rules

### BR-U5-01: Access Token Storage Location
- **Rule**: The `accessToken` MUST be stored exclusively in React state (AuthContext memory), never in `localStorage` or `sessionStorage`.
- **Rationale**: Prevents XSS attacks from reading the access token via `localStorage`.
- **Implementation**: `const [accessToken, setAccessToken] = useState<string | null>(null)` inside AuthContext.
- **Security Rule**: SECURITY-12 (token storage limitation documented).
- **Limitation**: Access token is lost on page refresh; the refresh flow re-acquires it automatically.

### BR-U5-02: Refresh Token Storage Location
- **Rule**: The `refreshToken` MUST be stored in `localStorage` under key `'tms_refresh_token'`.
- **Rationale**: Allows session persistence across page refreshes. Production systems should use `httpOnly` cookies; this is a documented simplification for the MVP.
- **Production Note**: In production, migrate to `httpOnly` cookie set by the backend to eliminate XSS risk on the refresh token.
- **Key**: `'tms_refresh_token'`

### BR-U5-03: Token Expiry Awareness
- **Rule**: The frontend does NOT decode or validate JWT expiry client-side. Token validity is determined by the backend's 401 response.
- **Rationale**: Avoids clock skew issues and keeps validation logic server-side.

---

## 2. Axios Interceptor Rules

### BR-U5-04: Bearer Token Attachment
- **Rule**: Every outgoing axios request MUST have the `Authorization: Bearer {accessToken}` header attached if `accessToken` is non-null.
- **Implementation**: Request interceptor reads `accessToken` from a ref (updated whenever AuthContext state changes).
- **Exception**: Requests to `/api/auth/login`, `/api/auth/register`, and `/api/auth/refresh` do NOT require the Authorization header.

### BR-U5-05: 401 Retry Logic
- **Rule**: On receiving a 401 response:
  1. If `_retry` flag is NOT set on the request config: set `_retry = true`, attempt token refresh, retry original request once.
  2. If `_retry` flag IS set: do NOT retry again; call `logout()` and navigate to `/login`.
- **Rationale**: Prevents infinite retry loops.

### BR-U5-06: Concurrent Request Queue
- **Rule**: If a token refresh is already in progress when a second 401 occurs, the second request MUST be queued (not trigger another refresh). All queued requests are retried after the single refresh completes.
- **Implementation**: `isRefreshing` boolean flag + `failedQueue` array.

### BR-U5-07: Refresh Failure Handling
- **Rule**: If `POST /api/auth/refresh` returns a 401 or network error, the user MUST be logged out immediately and redirected to `/login`.
- **Rationale**: Expired or revoked refresh token means the session is invalid.

---

## 3. Route Protection Rules

### BR-U5-08: PrivateRoute Guard
- **Rule**: All routes except `/login` and `/register` MUST be wrapped in `<PrivateRoute>`.
- **Implementation**: `PrivateRoute` checks `isAuthenticated` from `useAuth()`. If false, renders `<Navigate to="/login" state={{ from: location }} replace />`.
- **Security Rule**: SECURITY-08 (route guards).

### BR-U5-09: Post-Login Redirect
- **Rule**: After successful login, if the user was redirected from a protected route, they MUST be sent back to that route (not always to `/dashboard`).
- **Implementation**: Read `location.state?.from` in LoginPage; navigate to it after login success.

### BR-U5-10: Loading State Guard
- **Rule**: While `isLoading` is true in AuthContext (during initial token check), `PrivateRoute` MUST render a full-page skeleton/spinner, not redirect to `/login`.
- **Rationale**: Prevents flash of redirect before the auth state is determined.

---

## 4. Socket Connection Rules

### BR-U5-11: Socket Auth Token
- **Rule**: The Socket.io connection MUST pass the `accessToken` in `socket.handshake.auth.token`.
- **Implementation**: `io(VITE_SOCKET_URL, { auth: { token: accessToken } })`.
- **Security Rule**: SECURITY-08 (socket authentication).

### BR-U5-12: Socket Lifecycle
- **Rule**: Socket MUST connect when `isAuthenticated` becomes true and MUST disconnect when `isAuthenticated` becomes false.
- **Implementation**: `useEffect` in SocketContext watching `isAuthenticated`.

### BR-U5-13: Socket Reconnection
- **Rule**: Socket.io client MUST use default reconnection behavior (exponential backoff). Do NOT disable reconnection.
- **Configuration**: `reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000`.

---

## 5. Notification Rules

### BR-U5-14: Notification Array Limit
- **Rule**: The in-memory notifications array MUST NOT exceed 50 items.
- **Implementation**: When adding a new notification, if `notifications.length >= 50`, remove the last (oldest) item before prepending the new one.
- **Testable**: PBT-03 invariant — see Section 8.

### BR-U5-15: Notification Persistence
- **Rule**: Notifications are in-memory ONLY. They are NOT persisted to `localStorage` or any storage. They disappear on page refresh.
- **Rationale**: Per FR-NOTIF-04.

### BR-U5-16: Unread Count Accuracy
- **Rule**: `unreadCount` MUST equal the number of notifications where `isRead === false`.
- **Implementation**: Derived value, recalculated on every state change.

---

## 6. Workload Color Rules

### BR-U5-17: Workload Color Tiers
- **Rule**: The `getWorkloadColor(percentage)` function MUST return exactly one of `'green' | 'amber' | 'red'` for any input in [0, 100].

| Range | Color |
|---|---|
| 0 – 40 (inclusive) | `'green'` |
| 41 – 70 (inclusive) | `'amber'` |
| 71 – 100 (inclusive) | `'red'` |

- **Edge cases**: 0 → green, 40 → green, 41 → amber, 70 → amber, 71 → red, 100 → red.
- **Testable**: PBT-03 invariant — see Section 8.

### BR-U5-18: Workload Percentage Bounds
- **Rule**: Workload percentage values received from the API MUST be clamped to [0, 100] before rendering.
- **Implementation**: `Math.min(100, Math.max(0, percentage))`.

---

## 7. Sidebar Rules

### BR-U5-19: Sidebar Collapse Persistence
- **Rule**: The sidebar collapsed/expanded state MUST be persisted in `localStorage` under key `'tms-sidebar-collapsed'`.
- **Values**: `'true'` (collapsed) or `'false'` (expanded).
- **Initial load**: Read from localStorage; default to `'false'` (expanded) if not set.

### BR-U5-20: Sidebar Mobile Behavior
- **Rule**: On screens narrower than 768px (Tailwind `md` breakpoint), the sidebar MUST default to collapsed (icon-only) regardless of localStorage value.
- **Implementation**: Check `window.innerWidth < 768` on mount; override localStorage value if on mobile.

---

## 8. Dark/Light Mode Rules

### BR-U5-21: Theme Persistence
- **Rule**: The selected theme MUST be persisted in `localStorage` under key `'tms-theme'`.
- **Values**: `'dark'` or `'light'`.

### BR-U5-22: System Preference Fallback
- **Rule**: If no theme is stored in localStorage, the system preference (`prefers-color-scheme`) MUST be used as the default.
- **Implementation**: `window.matchMedia('(prefers-color-scheme: dark)').matches`.

### BR-U5-23: Tailwind Dark Class
- **Rule**: Dark mode is applied by adding/removing the `'dark'` class on `document.documentElement` (the `<html>` element).
- **Implementation**: `document.documentElement.classList.toggle('dark', isDark)`.

---

## 9. Security Rules (SECURITY BASELINE)

### BR-U5-SEC-04: Content Security Policy
- **Rule**: A `<meta http-equiv="Content-Security-Policy">` tag MUST be present in `index.html` with a restrictive CSP.
- **Minimum CSP**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' {VITE_API_URL} {VITE_SOCKET_URL}`.

### BR-U5-SEC-08: Route Guards
- **Rule**: Every page route except `/login` and `/register` MUST be protected by `PrivateRoute`.

### BR-U5-SEC-09: No API Keys in Bundle
- **Rule**: No API keys, secrets, or credentials MUST appear in the frontend bundle.
- **Verification**: `VITE_` prefixed env vars are acceptable (they are public by design); backend API keys must never be in frontend code.

### BR-U5-SEC-12: Token Storage Limitation
- **Rule**: Document the localStorage refresh token limitation in code comments and README.
- **Future**: Migrate to `httpOnly` cookie strategy when backend supports it.

---

## 10. Testable Properties (PBT)

### PBT-U5-01: Axios Request Config Serialization Round-Trip (PBT-02)

**Property**: For any valid axios request config object, serializing and deserializing the headers object preserves all header key-value pairs.

```typescript
// fast-check property
fc.property(
  fc.record({
    Authorization: fc.string().filter(s => s.startsWith('Bearer ')),
    'Content-Type': fc.constant('application/json'),
    'X-Request-ID': fc.uuid(),
  }),
  (headers) => {
    const serialized = JSON.stringify(headers);
    const deserialized = JSON.parse(serialized);
    return Object.keys(headers).every(
      (key) => deserialized[key] === headers[key]
    );
  }
)
```

**Rationale**: Ensures the interceptor's header manipulation does not corrupt request configs.

### PBT-U5-02: Workload Color Tier Invariant (PBT-03)

**Property**: For any integer percentage in [0, 100], `getWorkloadColor(percentage)` always returns exactly one of `'green' | 'amber' | 'red'`.

```typescript
// fast-check property
fc.property(
  fc.integer({ min: 0, max: 100 }),
  (percentage) => {
    const color = getWorkloadColor(percentage);
    return ['green', 'amber', 'red'].includes(color);
  }
)
```

**Rationale**: Ensures no percentage value produces an unexpected color or throws.

### PBT-U5-03: Notification Array Limit Invariant (PBT-03)

**Property**: After any sequence of `addNotification` calls, the notifications array length MUST never exceed 50.

```typescript
// fast-check property
fc.property(
  fc.array(fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('TASK_ASSIGNED', 'MESSAGE_RECEIVED', 'DOCUMENT_SHARED', 'TASK_COMPLETED'),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    body: fc.string({ minLength: 1, maxLength: 200 }),
    isRead: fc.boolean(),
    createdAt: fc.date().map(d => d.toISOString()),
    relatedId: fc.option(fc.uuid()),
  }), { minLength: 0, maxLength: 200 }),
  (notificationsToAdd) => {
    let state: NotificationDto[] = [];
    for (const n of notificationsToAdd) {
      if (state.length >= 50) {
        state = [n, ...state.slice(0, 49)];
      } else {
        state = [n, ...state];
      }
    }
    return state.length <= 50;
  }
)
```

**Rationale**: Ensures memory is bounded regardless of how many socket events arrive.

### PBT-U5-04: Workload Color Completeness (PBT-03)

**Property**: The three color tiers partition [0, 100] completely with no gaps.

```typescript
// fast-check property — verify boundary conditions
fc.property(
  fc.integer({ min: 0, max: 100 }),
  (pct) => {
    const color = getWorkloadColor(pct);
    if (pct <= 40) return color === 'green';
    if (pct <= 70) return color === 'amber';
    return color === 'red';
  }
)
```

---

## 11. Validation Rules

### BR-U5-VAL-01: Login Form Validation
- Email: required, valid email format
- Password: required, non-empty

### BR-U5-VAL-02: Register Form Validation
- Name: required, minimum 2 characters
- Email: required, valid email format
- Password: required, minimum 8 characters
- Confirm Password: must match Password field

### BR-U5-VAL-03: Client-Side vs Server-Side
- **Rule**: Client-side validation (Zod) provides immediate feedback. Server-side validation is the authoritative source. Server validation errors MUST be displayed to the user.
- **Implementation**: On API error with `errors` field, map server errors to form field errors.

---

## 12. Accessibility Rules

### BR-U5-A11Y-01: ARIA Labels
- All interactive elements (buttons, inputs, links) MUST have accessible labels.
- Icon-only buttons MUST have `aria-label` attributes.
- Form inputs MUST have associated `<label>` elements or `aria-label`.

### BR-U5-A11Y-02: Keyboard Navigation
- All interactive elements MUST be reachable via Tab key.
- Modal dialogs MUST trap focus within the modal.
- Escape key MUST close modals and dropdowns.

### BR-U5-A11Y-03: Color Contrast
- Text color contrast ratio MUST be ≥ 4.5:1 against background (WCAG 2.1 AA).
- Status badge colors MUST meet contrast requirements.
