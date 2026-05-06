# Business Logic Model — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## 1. Animation Specifications

### Page Transitions (Framer Motion)
```typescript
export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
// Usage: wrap each page in <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
```

### Drawer Slide (ProfileDrawer, ShareModal)
```typescript
export const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
};
```

### Card Hover
```typescript
export const cardHoverVariants = {
  rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', transition: { duration: 0.15 } },
};
```

### Reduced Motion
```typescript
// All animation components check useReducedMotion()
const shouldReduceMotion = useReducedMotion();
const variants = shouldReduceMotion ? {} : pageVariants;
```

---

## 2. Skeleton Loader Variants

```typescript
// Card skeleton: 200px height, rounded corners, shimmer animation
// List item skeleton: 60px height, avatar circle + two text lines
// Text skeleton: multiple lines of varying width (100%, 80%, 60%)
// Chart skeleton: rectangular placeholder matching chart dimensions
```

---

## 3. Error Boundary

```typescript
class ErrorBoundary extends React.Component<{ children: ReactNode; fallback?: ReactNode }> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    return this.props.children;
  }
}
```

---

## 4. PBT Test Targets

| Target | Property Type | Rule |
|---|---|---|
| `calculateWorkload(openTasks, role)` | Invariant: result in [0,100] | PBT-03 |
| `canAssign(assignerId, assigneeId)` | Invariant: deterministic | PBT-03 |
| `generateAccessToken` → `verifyAccessToken` | Round-trip | PBT-02 |
| Task status transitions | Idempotent: same status → same result | PBT-04 |
| Message JSON serialize → deserialize | Round-trip | PBT-02 |
| Document sharedWith merge | Invariant: no duplicates | PBT-03 |
| Workload color tier | Invariant: always 'green'|'amber'|'red' | PBT-03 |

---

## 5. Integration Test Targets

| Flow | Endpoints Tested |
|---|---|
| Auth: register → login → refresh → logout | POST /auth/register, /auth/login, /auth/refresh, /auth/logout |
| Task CRUD with role guards | POST /tasks (as TM assigning to JTM), POST /tasks (as JTM — expect 403) |
| Chat: send DM → read receipt | POST /messages/direct, POST /messages/:id/read |
| Document: create → share → access as shared user | POST /documents, POST /documents/:id/share, GET /documents/:id |
| AI summarize: upload file → get response | POST /ai/summarize |
