import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Users } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { ProfileDrawer } from '../components/team/ProfileDrawer';
import { Avatar } from '../components/common/Avatar';
import { RoleBadge } from '../components/common/RoleBadge';
import { buildOrgTree, getSubtreeIds, type OrgTreeNode } from '../utils/orgTree';
import { getUsersApi, updateSupervisorApi } from '../api/users.api';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@tms/shared';
import type { User } from '@tms/shared';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

// â”€â”€â”€ Card dimensions (must match CSS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CARD_W = 160;   // px  (w-40)
const CARD_H = 140;   // px  approximate rendered height
const H_GAP  = 40;    // px  horizontal gap between siblings
const V_GAP  = 64;    // px  vertical gap between levels

// â”€â”€â”€ Measure subtree width â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function subtreeWidth(node: OrgTreeNode): number {
  if (node.children.length === 0) return CARD_W;
  const childrenTotal = node.children.reduce(
    (sum, c) => sum + subtreeWidth(c),
    0
  ) + H_GAP * (node.children.length - 1);
  return Math.max(CARD_W, childrenTotal);
}

// â”€â”€â”€ Draggable card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CardProps {
  user: User;
  canDrag: boolean;
  isOverlay?: boolean;
  isOver?: boolean;
  onSelect: (u: User) => void;
}

function OrgCard({ user, canDrag, isOverlay = false, isOver = false, onSelect }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: user.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.2 : 1,
    width: CARD_W,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'relative flex flex-col items-center gap-3 p-4 rounded-2xl border select-none transition-all duration-150',
        isOverlay
          ? 'glass-strong border-white/30 shadow-2xl rotate-2 scale-105'
          : isOver
          ? 'glass-strong border-white/30 shadow-lg'
          : 'glass border-white/10 hover:border-white/25 hover:bg-white/10',
        isDragging && 'border-dashed border-white/20'
      )}
    >
      {/* Drag handle */}
      {canDrag && (
        <div
          {...listeners}
          {...attributes}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors touch-none"
          aria-label="Drag to reassign"
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Avatar + info */}
      <button
        onClick={() => onSelect(user)}
        className="flex flex-col items-center gap-2 w-full focus:outline-none"
        aria-label={`Open ${user.name}'s profile`}
      >
        <Avatar
          src={user.avatarUrl}
          name={user.name}
          size="lg"
          status={user.availabilityStatus}
        />
        <div className="w-full text-center">
          <p className="text-sm font-semibold text-white leading-tight truncate px-1">
            {user.name}
          </p>
          <div className="mt-1.5 flex justify-center">
            <RoleBadge role={user.role} />
          </div>
        </div>
      </button>
    </div>
  );
}

// â”€â”€â”€ Droppable wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DroppableCard({
  user,
  canDrag,
  isOver,
  onSelect,
}: {
  user: User;
  canDrag: boolean;
  isOver: boolean;
  onSelect: (u: User) => void;
}) {
  const { setNodeRef } = useDroppable({ id: user.id });
  return (
    <div ref={setNodeRef}>
      <OrgCard user={user} canDrag={canDrag} isOver={isOver} onSelect={onSelect} />
    </div>
  );
}

// â”€â”€â”€ Recursive tree node (absolutely positioned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TreeNodeProps {
  node: OrgTreeNode;
  x: number;          // center x of this node
  y: number;          // top y of this node
  onSelect: (u: User) => void;
  canDrag: (id: string) => boolean;
  overNodeId: string | null;
  elements: React.ReactNode[];  // collect all rendered elements
}

function collectTreeElements({
  node, x, y, onSelect, canDrag, overNodeId, elements,
}: TreeNodeProps): number {
  // Push this card
  elements.push(
    <div
      key={node.id}
      style={{ position: 'absolute', left: x - CARD_W / 2, top: y }}
    >
      <DroppableCard
        user={node}
        canDrag={canDrag(node.id)}
        isOver={overNodeId === node.id}
        onSelect={onSelect}
      />
    </div>
  );

  if (node.children.length === 0) return y + CARD_H;

  // Vertical stem down from this card
  const stemTopY = y + CARD_H;
  const stemBotY = stemTopY + V_GAP / 2;
  elements.push(
    <div
      key={`vstem-${node.id}`}
      style={{
        position: 'absolute',
        left: x - 1.5,
        top: stemTopY,
        width: 3,
        height: V_GAP / 2,
        background: 'var(--connector-color)',
      }}
    />
  );

  // Compute children positions
  const totalChildrenWidth =
    node.children.reduce((s, c) => s + subtreeWidth(c), 0) +
    H_GAP * (node.children.length - 1);

  let childX = x - totalChildrenWidth / 2;
  const childCenters: number[] = [];

  for (const child of node.children) {
    const cw = subtreeWidth(child);
    childCenters.push(childX + cw / 2);
    childX += cw + H_GAP;
  }

  // Horizontal connector line spanning all children centers
  if (node.children.length > 1) {
    const lineLeft = childCenters[0]!;
    const lineRight = childCenters[childCenters.length - 1]!;
    elements.push(
      <div
        key={`hline-${node.id}`}
        style={{
          position: 'absolute',
          left: lineLeft,
          top: stemBotY,
          width: lineRight - lineLeft,
          height: 3,
          background: 'var(--connector-color)',
        }}
      />
    );
  }

  // Vertical stems up from each child to the horizontal line
  const childY = stemBotY + V_GAP / 2;
  for (const cx of childCenters) {
    elements.push(
      <div
        key={`cstem-${node.id}-${cx}`}
        style={{
          position: 'absolute',
          left: cx - 1.5,
          top: stemBotY,
          width: 3,
          height: V_GAP / 2,
          background: 'var(--connector-color)',
        }}
      />
    );
  }

  // Recurse into children
  let maxBottom = childY;
  for (let i = 0; i < node.children.length; i++) {
    const bottom = collectTreeElements({
      node: node.children[i]!,
      x: childCenters[i]!,
      y: childY,
      onSelect,
      canDrag,
      overNodeId,
      elements,
    });
    maxBottom = Math.max(maxBottom, bottom);
  }

  return maxBottom;
}

// â”€â”€â”€ Full org chart canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrgChart({
  roots,
  onSelect,
  canDrag,
  overNodeId,
}: {
  roots: OrgTreeNode[];
  onSelect: (u: User) => void;
  canDrag: (id: string) => boolean;
  overNodeId: string | null;
}) {
  // Compute total canvas width
  const totalWidth =
    roots.reduce((s, r) => s + subtreeWidth(r), 0) +
    (roots.length - 1) * H_GAP * 3;

  const elements: React.ReactNode[] = [];
  let maxBottom = 0;
  let rootX = 0;

  for (const root of roots) {
    const rw = subtreeWidth(root);
    const cx = rootX + rw / 2;
    const bottom = collectTreeElements({
      node: root,
      x: cx,
      y: 0,
      onSelect,
      canDrag,
      overNodeId,
      elements,
    });
    maxBottom = Math.max(maxBottom, bottom);
    rootX += rw + H_GAP * 3;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: Math.max(totalWidth, 600),
        height: maxBottom + 32,
        minWidth: '100%',
      }}
    >
      {elements}
    </div>
  );
}

// â”€â”€â”€ Team page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Team() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overNodeId, setOverNodeId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    getUsersApi()
      .then(setUsers)
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setIsLoading(false));
  }, []);

  const tree = useMemo(() => buildOrgTree(users), [users]);

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeId) ?? null,
    [users, activeId]
  );

  const canDrag = useCallback(
    (targetUserId: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === Role.ADMIN) return true;
      if (currentUser.role === Role.TEAM_LEADER) {
        return getSubtreeIds(currentUser.id, users).includes(targetUserId);
      }
      return false;
    },
    [currentUser, users]
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragOver  = (e: DragOverEvent)  => setOverNodeId(e.over ? String(e.over.id) : null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverNodeId(null);

    if (!over || active.id === over.id) return;

    const draggedId      = String(active.id);
    const newSupervisorId = String(over.id);
    const originalSupervisorId = users.find((u) => u.id === draggedId)?.supervisorId ?? null;

    if (getSubtreeIds(draggedId, users).includes(newSupervisorId)) {
      toast.error("Can't move a node under its own descendant");
      return;
    }

    const draggedName    = users.find((u) => u.id === draggedId)?.name ?? 'User';
    const supervisorName = users.find((u) => u.id === newSupervisorId)?.name ?? 'new supervisor';

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => u.id === draggedId ? { ...u, supervisorId: newSupervisorId } : u)
    );

    try {
      await updateSupervisorApi(draggedId, newSupervisorId);
      toast.success(`${draggedName} now reports to ${supervisorName}`);
    } catch {
      setUsers((prev) =>
        prev.map((u) => u.id === draggedId ? { ...u, supervisorId: originalSupervisorId } : u)
      );
      toast.error('Failed to update hierarchy â€” reverted');
    }
  };

  return (
    <PageWrapper title="Team Hierarchy">
      <div data-testid="team-page">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <GripVertical size={12} />
            Drag a card onto another to reassign reporting
          </span>
          {currentUser?.role === Role.ADMIN && (
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">
              Admin â€” drag any node
            </span>
          )}
          {currentUser?.role === Role.TEAM_LEADER && (
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
              Team Leader â€” drag within your subtree
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-6 flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" className="w-40 h-36" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users size={48} className="mb-3 opacity-30" />
            <p>No team members found</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(e) => void handleDragEnd(e)}
          >
            {/* Centered scrollable org chart */}
            <div className="overflow-auto pb-8 pt-2 flex justify-center">
              <div className="px-8 py-4">
                <OrgChart
                  roots={tree}
                  onSelect={setSelectedUser}
                  canDrag={canDrag}
                  overNodeId={overNodeId}
                />
              </div>
            </div>

            {/* Ghost card following cursor */}
            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
              {activeUser && (
                <OrgCard
                  user={activeUser}
                  canDrag={false}
                  isOverlay
                  onSelect={() => undefined}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ProfileDrawer
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        allUsers={users}
      />
    </PageWrapper>
  );
}


