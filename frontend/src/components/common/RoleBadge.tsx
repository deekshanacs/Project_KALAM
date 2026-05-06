import { Role } from '@tms/shared';
import { clsx } from 'clsx';
import { getRoleBadgeColor, getRoleLabel } from '../../utils/rolePermissions';

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      data-testid="role-badge"
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        getRoleBadgeColor(role)
      )}
    >
      {getRoleLabel(role)}
    </span>
  );
}
