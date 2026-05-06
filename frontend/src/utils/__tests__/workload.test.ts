import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getWorkloadColor, getWorkloadPercentage } from '../workload';
import { Role } from '@tms/shared';

describe('getWorkloadColor', () => {
  it('returns green for 0%', () => expect(getWorkloadColor(0)).toBe('green'));
  it('returns green for 40%', () => expect(getWorkloadColor(40)).toBe('green'));
  it('returns amber for 50%', () => expect(getWorkloadColor(50)).toBe('amber'));
  it('returns amber for 70%', () => expect(getWorkloadColor(70)).toBe('amber'));
  it('returns red for 80%', () => expect(getWorkloadColor(80)).toBe('red'));
  it('returns red for 100%', () => expect(getWorkloadColor(100)).toBe('red'));

  it('PBT: always returns a valid color tier', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (pct) => {
        const color = getWorkloadColor(pct);
        return color === 'green' || color === 'amber' || color === 'red';
      }),
      { verbose: true }
    );
  });
});

describe('getWorkloadPercentage', () => {
  it('returns 0 for 0 open tasks', () => {
    expect(getWorkloadPercentage(0, Role.TEAM_MEMBER)).toBe(0);
  });

  it('returns 100 for tasks exceeding capacity', () => {
    expect(getWorkloadPercentage(100, Role.JUNIOR_MEMBER)).toBe(100);
  });

  it('PBT: always returns percentage in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.constantFrom(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
        (openTasks, role) => {
          const pct = getWorkloadPercentage(openTasks, role);
          return pct >= 0 && pct <= 100;
        }
      ),
      { verbose: true }
    );
  });
});
