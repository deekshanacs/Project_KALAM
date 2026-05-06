import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, MessageSquare, Briefcase, UserCheck, CheckSquare } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { WorkloadBar } from '../common/WorkloadBar';
import { drawerVariants } from '../../utils/animations';
import { getUserTasksApi, getWorkloadApi } from '../../api/users.api';
import type { User, TaskWithRelations, WorkloadDto } from '@tms/shared';
import { TaskStatus } from '@tms/shared';
import { formatDate } from '../../utils/formatters';
import { clsx } from 'clsx';

interface ProfileDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];   // to look up supervisor name
}

const roleLabel: Record<string, string> = {
  ADMIN:         'Administrator',
  TEAM_LEADER:   'Team Leader',
  TEAM_MEMBER:   'Team Member',
  JUNIOR_MEMBER: 'Junior Member',
};

export function ProfileDrawer({ user, isOpen, onClose, allUsers }: ProfileDrawerProps) {
  const shouldReduce = useReducedMotion();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [workload, setWorkload] = useState<WorkloadDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    setIsLoading(true);
    Promise.all([
      getUserTasksApi(user.id),
      getWorkloadApi(user.id),
    ])
      .then(([t, w]) => { setTasks(t); setWorkload(w); })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [user, isOpen]);

  const supervisor = allUsers.find((u) => u.id === user?.supervisorId);
  const activeTasks = tasks.filter((t) => t.status !== TaskStatus.DONE);
  const doneTasks   = tasks.filter((t) => t.status === TaskStatus.DONE);

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            data-testid="profile-drawer"
            variants={shouldReduce ? {} : drawerVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed right-0 top-0 h-full w-88 max-w-sm z-50 overflow-y-auto scrollbar-thin glass-strong border-l border-white/12 shadow-2xl"
            style={{ width: 340 }}
          >
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Profile</h2>
                <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white glass rounded-lg transition-all" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  <Avatar src={user.avatarUrl} name={user.name} size="lg" status={user.availabilityStatus} />
                  <div className="absolute -bottom-1 -right-1">
                    <StatusBadge status={user.availabilityStatus} showLabel={false} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{user.name}</p>
                  {/* Designation — shown as subtitle */}
                  <p className="text-sm text-gray-400 mt-0.5">{roleLabel[user.role] ?? user.role}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Info cards */}
              <div className="space-y-3">
                {/* Supervisor */}
                <div className="glass rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={15} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Reports to</p>
                    <p className="text-sm font-medium text-white truncate">
                      {supervisor ? supervisor.name : '— (Top level)'}
                    </p>
                  </div>
                </div>

                {/* Workload */}
                <div className="glass rounded-xl p-3.5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={15} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Workload</p>
                      <p className="text-sm font-medium text-white">
                        {workload ? `${workload.openTasks} / ${workload.maxCapacity} tasks` : '—'}
                      </p>
                    </div>
                  </div>
                  <WorkloadBar percentage={workload?.percentage ?? 0} showLabel />
                </div>

                {/* Active tasks */}
                <div className="glass rounded-xl p-3.5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                      <CheckSquare size={15} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Current Work</p>
                      <p className="text-sm font-medium text-white">
                        {activeTasks.length} active · {doneTasks.length} done
                      </p>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />)}
                    </div>
                  ) : activeTasks.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-2">No active tasks</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                      {activeTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-start gap-2 p-2 bg-white/4 rounded-lg">
                          <span className={clsx(
                            'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                            task.status === 'IN_PROGRESS' ? 'bg-white/60' :
                            task.status === 'REVIEW'      ? 'bg-white/40' : 'bg-white/20'
                          )} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-600">Due {formatDate(task.dueDate)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat button */}
              <button className="w-full flex items-center justify-center gap-2.5 py-3 glass hover:bg-white/12 text-white rounded-xl text-sm font-medium transition-all border border-white/15 shadow-sm">
                <MessageSquare size={15} />
                Chat with {user.name.split(' ')[0]}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
