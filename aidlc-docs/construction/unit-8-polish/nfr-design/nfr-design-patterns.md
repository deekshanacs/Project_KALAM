# NFR Design Patterns — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## Reduced Motion Pattern
```typescript
// components/common/AnimatedWrapper.tsx
import { useReducedMotion, motion, MotionProps } from 'framer-motion';
export function AnimatedWrapper({ children, variants, ...props }: MotionProps & { children: ReactNode }) {
  const shouldReduce = useReducedMotion();
  return <motion.div variants={shouldReduce ? {} : variants} {...props}>{children}</motion.div>;
}
```

## Error Boundary Pattern
```typescript
// components/common/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    return this.props.children;
  }
}
```

## PBT Seed Logging Pattern (CI)
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['verbose'],  // logs seed on failure
    globals: true,
  },
});

// In each PBT test:
fc.assert(
  fc.property(...),
  { verbose: true }  // logs seed + shrunk example on failure
);
```

## Test Isolation Pattern
```typescript
// backend/tests/helpers/testDb.ts
export async function cleanDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.timeLog.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.groupMember.deleteMany(),
    prisma.group.deleteMany(),
    prisma.task.deleteMany(),
    prisma.document.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
// Called in beforeEach for integration tests
```

## Code Splitting Pattern
```typescript
// App.tsx
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const TeamPage = React.lazy(() => import('./pages/Team'));
const TasksPage = React.lazy(() => import('./pages/Tasks'));
const ChatPage = React.lazy(() => import('./pages/Chat'));
const AIToolsPage = React.lazy(() => import('./pages/AITools'));
const DocumentsPage = React.lazy(() => import('./pages/Documents'));
// Wrapped in <Suspense fallback={<PageSkeleton />}>
```
