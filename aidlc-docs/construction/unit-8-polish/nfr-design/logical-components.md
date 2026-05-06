# Logical Components — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## ErrorBoundary
Class component wrapping each page. Catches render errors, shows `ErrorFallback` with retry.

## NotificationDropdown
Renders list of recent notifications from `useNotifications` hook. "Mark all read" button. Clicking item navigates to resource.

## AnimationVariants (`/utils/animations.ts`)
Shared Framer Motion variants: `pageVariants`, `drawerVariants`, `cardHoverVariants`, `fadeVariants`. All respect `useReducedMotion`.

## TestUtils (`/tests/helpers/`)
- `renderWithProviders(ui, options)`: wraps component with AuthContext, SocketContext, Router, QueryClient
- `createMockUser(overrides?)`: returns a valid User object with defaults
- `createMockTask(overrides?)`: returns a valid Task object with defaults
- `createMockMessage(overrides?)`: returns a valid Message object with defaults
- `cleanDatabase()`: deletes all test data in correct order

## PBTGenerators (`/tests/generators/`)
fast-check arbitraries for domain types:
```typescript
export const userArb = fc.record({
  id: fc.string({ minLength: 1 }),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  role: fc.constantFrom<Role>('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
  availabilityStatus: fc.constantFrom<AvailabilityStatus>('AVAILABLE', 'IN_CALL', 'AWAY', 'OFFLINE'),
  avatarUrl: fc.option(fc.webUrl(), { nil: null }),
  supervisorId: fc.option(fc.string(), { nil: null }),
});

export const taskArb = fc.record({
  id: fc.string({ minLength: 1 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constantFrom<TaskStatus>('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
  priority: fc.constantFrom<Priority>('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
  attachments: fc.array(fc.webUrl(), { maxLength: 10 }),
});

export const messageArb = fc.record({
  id: fc.string({ minLength: 1 }),
  content: fc.option(fc.string({ maxLength: 5000 }), { nil: null }),
  type: fc.constantFrom<MessageType>('TEXT', 'FILE', 'IMAGE', 'LINK'),
  readBy: fc.uniqueArray(fc.string({ minLength: 1 }), { maxLength: 20 }),
  attachments: fc.array(fc.webUrl(), { maxLength: 5 }),
});
```
