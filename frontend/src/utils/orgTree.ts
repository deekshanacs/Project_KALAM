import type { User } from '@tms/shared';

export interface OrgTreeNode extends User {
  children: OrgTreeNode[];
}

export function buildOrgTree(users: User[]): OrgTreeNode[] {
  const map = new Map<string, OrgTreeNode>();
  users.forEach((u) => map.set(u.id, { ...u, children: [] }));

  const roots: OrgTreeNode[] = [];
  for (const node of map.values()) {
    if (!node.supervisorId) {
      roots.push(node);
    } else {
      const parent = map.get(node.supervisorId);
      if (parent) parent.children.push(node);
      else roots.push(node); // orphan → treat as root
    }
  }
  return roots;
}

export function getSubtreeIds(userId: string, users: User[]): string[] {
  const ids: string[] = [];
  const queue = [userId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = users.filter((u) => u.supervisorId === current);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}
