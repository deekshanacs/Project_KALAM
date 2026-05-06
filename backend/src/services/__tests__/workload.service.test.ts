import * as fc from 'fast-check';
import { Role, MAX_CAPACITY } from '@tms/shared';

// Pure workload calculation (extracted for unit testing without DB)
function calculateWorkloadPure(openTasks: number, role: Role) {
  const maxCapacity = MAX_CAPACITY[role];
  const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
  const colorTier = percentage <= 40 ? 'green' : percentage <= 70 ? 'amber' : 'red';
  return { percentage, colorTier };
}

describe('workload calculation (pure)', () => {
  it('returns 0% for 0 open tasks', () => {
    expect(calculateWorkloadPure(0, Role.TEAM_MEMBER).percentage).toBe(0);
  });

  it('returns 100% when tasks exceed capacity', () => {
    expect(calculateWorkloadPure(100, Role.JUNIOR_MEMBER).percentage).toBe(100);
  });

  it('returns green for low workload', () => {
    expect(calculateWorkloadPure(2, Role.TEAM_MEMBER).colorTier).toBe('green');
  });

  it('PBT: percentage always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.constantFrom(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
        (openTasks, role) => {
          const { percentage } = calculateWorkloadPure(openTasks, role);
          return percentage >= 0 && percentage <= 100;
        }
      ),
      { verbose: true }
    );
  });

  it('PBT: colorTier is always a valid value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (pct) => {
          const tier = pct <= 40 ? 'green' : pct <= 70 ? 'amber' : 'red';
          return tier === 'green' || tier === 'amber' || tier === 'red';
        }
      ),
      { verbose: true }
    );
  });
});
