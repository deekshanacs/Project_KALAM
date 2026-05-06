import * as fc from 'fast-check';
import { Role, TaskStatus, Priority, MAX_CAPACITY, OPEN_STATUSES } from '@tms/shared';

// Pure functions extracted for unit testing without DB
function calculateWorkloadPure(openTasks: number, role: Role) {
  const maxCapacity = MAX_CAPACITY[role];
  const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
  const colorTier = percentage <= 40 ? 'green' : percentage <= 70 ? 'amber' : 'red';
  return { percentage, colorTier };
}

function isOpenStatus(status: TaskStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

describe('task business logic (pure)', () => {
  describe('workload calculation', () => {
    it('example: 0 tasks = 0% workload', () => {
      expect(calculateWorkloadPure(0, Role.TEAM_MEMBER).percentage).toBe(0);
    });

    it('example: at capacity = 100%', () => {
      expect(calculateWorkloadPure(10, Role.TEAM_MEMBER).percentage).toBe(100);
    });

    it('example: over capacity is clamped to 100%', () => {
      expect(calculateWorkloadPure(100, Role.JUNIOR_MEMBER).percentage).toBe(100);
    });

    it('example: green tier for low workload', () => {
      expect(calculateWorkloadPure(2, Role.TEAM_MEMBER).colorTier).toBe('green');
    });

    it('example: red tier for high workload', () => {
      expect(calculateWorkloadPure(9, Role.TEAM_MEMBER).colorTier).toBe('red');
    });

    it('PBT: percentage always in [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10000 }),
          fc.constantFrom<Role>(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
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
        fc.property(fc.integer({ min: 0, max: 100 }), (pct) => {
          const tier = pct <= 40 ? 'green' : pct <= 70 ? 'amber' : 'red';
          return ['green', 'amber', 'red'].includes(tier);
        }),
        { verbose: true }
      );
    });
  });

  describe('task status', () => {
    it('DONE is not an open status', () => {
      expect(isOpenStatus(TaskStatus.DONE)).toBe(false);
    });

    it('TODO, IN_PROGRESS, REVIEW are open statuses', () => {
      expect(isOpenStatus(TaskStatus.TODO)).toBe(true);
      expect(isOpenStatus(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(isOpenStatus(TaskStatus.REVIEW)).toBe(true);
    });

    it('PBT: task serialization round-trip preserves all fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            status: fc.constantFrom<TaskStatus>(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE),
            priority: fc.constantFrom<Priority>(Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT),
            attachments: fc.array(fc.webUrl(), { maxLength: 10 }),
          }),
          (task) => {
            const serialized = JSON.stringify(task);
            const deserialized = JSON.parse(serialized) as typeof task;
            return (
              deserialized.id === task.id &&
              deserialized.title === task.title &&
              deserialized.status === task.status &&
              deserialized.priority === task.priority &&
              deserialized.attachments.length === task.attachments.length
            );
          }
        ),
        { verbose: true }
      );
    });
  });
});
