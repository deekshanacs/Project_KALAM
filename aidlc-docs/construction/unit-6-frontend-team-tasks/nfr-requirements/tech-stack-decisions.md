# Tech Stack Decisions — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction  
**Note**: All packages from Unit 5 are inherited. This document lists ADDITIONAL packages introduced in Unit 6.

---

## 1. Drag-and-Drop

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `@dnd-kit/core` | `6.3.1` | Core drag-and-drop primitives | Accessible, modular, TypeScript-native |
| `@dnd-kit/sortable` | `8.0.0` | Sortable list/grid utilities | Built on @dnd-kit/core, handles reordering |
| `@dnd-kit/utilities` | `3.2.2` | CSS transform utilities | `CSS.Transform.toString()` helper |
| `@dnd-kit/accessibility` | `3.1.1` | ARIA announcements for DnD | Screen reader support for drag operations |

### Why @dnd-kit over react-beautiful-dnd?

- `react-beautiful-dnd` is in maintenance mode (no new features).
- `@dnd-kit` is actively maintained, TypeScript-first, and more flexible.
- `@dnd-kit` supports both mouse and touch events natively.
- `@dnd-kit` has better accessibility support via `@dnd-kit/accessibility`.
- `@dnd-kit` does not require a specific DOM structure.

### @dnd-kit Version Compatibility

```
@dnd-kit/core 6.x requires React 16.8+ (satisfied by React 18)
@dnd-kit/sortable 8.x requires @dnd-kit/core 6.x
@dnd-kit/utilities 3.x requires @dnd-kit/core 6.x
```

### Key @dnd-kit APIs Used

**Org Chart (useDraggable + useDroppable)**:
```typescript
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';

// In ProfileCard:
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: user.id,
  data: { type: 'profile-card', user },
});

const { setNodeRef: setDropRef, isOver } = useDroppable({
  id: user.id,
  data: { type: 'profile-card', user },
});
```

**Kanban Board (SortableContext)**:
```typescript
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// In TaskCard:
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: task.id });

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
};
```

---

## 2. Animation (Reused from Unit 5)

| Package | Pinned Version | Purpose |
|---|---|---|
| `framer-motion` | `11.11.11` | ProfileDrawer slide-in animation, card hover effects |

### New Framer Motion Usage in Unit 6

```typescript
// ProfileDrawer slide-in
const drawerVariants = {
  hidden: { x: 400, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { x: 400, opacity: 0, transition: { duration: 0.2 } },
};

// TaskCard hover
const cardVariants = {
  rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: { scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
};
```

---

## 3. Virtual List (Conditional)

| Package | Pinned Version | Purpose | When Used |
|---|---|---|---|
| `react-window` | `1.8.10` | Virtual list rendering | When Kanban column has > 50 tasks |
| `@types/react-window` | `1.8.8` | TypeScript types | Paired with react-window |

### Why react-window?

- Renders only visible items in a long list.
- Prevents DOM bloat when a Kanban column has 100+ tasks.
- `FixedSizeList` is the simplest API for uniform-height task cards.

### Integration with @dnd-kit

Virtual lists require special handling with @dnd-kit because items outside the viewport are not in the DOM. For MVP (up to 200 tasks), virtual list is applied only when a column exceeds 50 items. The `DragOverlay` pattern ensures the dragged item is always visible.

---

## 4. Date Handling

| Package | Pinned Version | Purpose | Rationale |
|---|---|---|---|
| `date-fns` | `4.1.0` | Date formatting and comparison | Lightweight, tree-shakeable, no global state |

### Usage in Unit 6

```typescript
import { format, isPast, formatDistanceToNow } from 'date-fns';

// Format due date
const formattedDue = format(new Date(task.dueDate), 'MMM d, yyyy');

// Check if overdue
const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

// Relative time for comments
const relativeTime = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
```

---

## 5. Updated package.json (Unit 6 additions)

```json
{
  "dependencies": {
    "@dnd-kit/core": "6.3.1",
    "@dnd-kit/sortable": "8.0.0",
    "@dnd-kit/utilities": "3.2.2",
    "@dnd-kit/accessibility": "3.1.1",
    "react-window": "1.8.10",
    "date-fns": "4.1.0"
  },
  "devDependencies": {
    "@types/react-window": "1.8.8"
  }
}
```

---

## 6. Sensor Configuration

@dnd-kit sensors determine how drag operations are initiated. Proper configuration prevents accidental drags when clicking.

```typescript
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Must move 8px before drag starts (prevents accidental drags)
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

The `distance: 8` activation constraint is critical for the org chart where clicking a ProfileCard opens the ProfileDrawer. Without this constraint, any click would initiate a drag.

---

## 7. Collision Detection Strategy

@dnd-kit supports multiple collision detection algorithms:

| Algorithm | Use Case |
|---|---|
| `closestCenter` | Kanban board (sortable within column) |
| `closestCorners` | Org chart (drop onto node) |
| `rectIntersection` | Default, good for most cases |

```typescript
// Kanban board
<DndContext collisionDetection={closestCenter} sensors={sensors}>

// Org chart
<DndContext collisionDetection={closestCorners} sensors={sensors}>
```
