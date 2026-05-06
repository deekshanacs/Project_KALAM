import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { canAssign } from '../rolePermissions';
import { Role } from '@tms/shared';

describe('canAssign', () => {
  it('Admin can assign to anyone', () => {
    expect(canAssign(Role.ADMIN, Role.JUNIOR_MEMBER)).toBe(true);
    expect(canAssign(Role.ADMIN, Role.ADMIN)).toBe(true);
  });

  it('Junior member cannot assign to anyone', () => {
    expect(canAssign(Role.JUNIOR_MEMBER, Role.JUNIOR_MEMBER)).toBe(false);
    expect(canAssign(Role.JUNIOR_MEMBER, Role.TEAM_MEMBER)).toBe(false);
  });

  it('Team Leader can assign to Team Member and Junior Member', () => {
    expect(canAssign(Role.TEAM_LEADER, Role.TEAM_MEMBER)).toBe(true);
    expect(canAssign(Role.TEAM_LEADER, Role.JUNIOR_MEMBER)).toBe(true);
  });

  it('Team Member can assign to Junior Member only', () => {
    expect(canAssign(Role.TEAM_MEMBER, Role.JUNIOR_MEMBER)).toBe(true);
    expect(canAssign(Role.TEAM_MEMBER, Role.TEAM_MEMBER)).toBe(false);
  });

  it('PBT: canAssign is deterministic (same inputs = same output)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
        fc.constantFrom(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
        (assignerRole, assigneeRole) => {
          return canAssign(assignerRole, assigneeRole) === canAssign(assignerRole, assigneeRole);
        }
      ),
      { verbose: true }
    );
  });
});
