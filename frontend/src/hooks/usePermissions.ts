import { Role, ROLE_WEIGHT } from '@tms/shared';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  function canAssignTask(assigneeRole: Role): boolean {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;  // Admin assigns to anyone
    if (user.role === Role.JUNIOR_MEMBER) return false;
    // TL can assign to TM and JTM; TM can assign to JTM only
    return ROLE_WEIGHT[user.role] > ROLE_WEIGHT[assigneeRole];
  }

  function canDragNode(_targetUserId: string, targetSupervisorId: string | null): boolean {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.TEAM_LEADER) {
      // TL can drag nodes that are in their subtree (supervisor chain leads to them)
      return targetSupervisorId !== null;
    }
    return false;
  }

  function canEditDocument(ownerId: string): boolean {
    if (!user) return false;
    return user.role === Role.ADMIN || user.id === ownerId;
  }

  return { canAssignTask, canDragNode, canEditDocument };
}
