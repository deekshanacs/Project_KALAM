import { Role, ROLE_WEIGHT } from '@tms/shared';

export function canAssign(assignerRole: Role, assigneeRole: Role): boolean {
  if (assignerRole === Role.ADMIN) return true;
  if (assignerRole === Role.JUNIOR_MEMBER) return false;
  return ROLE_WEIGHT[assignerRole] > ROLE_WEIGHT[assigneeRole];
}

export function getRoleBadgeColor(role: Role): string {
  switch (role) {
    case Role.ADMIN: return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case Role.TEAM_LEADER: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case Role.TEAM_MEMBER: return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case Role.JUNIOR_MEMBER: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

export function getRoleLabel(role: Role): string {
  switch (role) {
    case Role.ADMIN: return 'Admin';
    case Role.TEAM_LEADER: return 'Team Leader';
    case Role.TEAM_MEMBER: return 'Team Member';
    case Role.JUNIOR_MEMBER: return 'Junior Member';
  }
}
