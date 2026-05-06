import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Clock, Eye, Circle } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskModal } from '../components/tasks/TaskModal';
import { getTasksApi, updateTaskStatusApi } from '../api/tasks.api';
import type { TaskWithRelations } from '@tms/shared';
import { TaskStatus } from '@tms/shared';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const COLUMNS: { status: TaskStatus; label: string; icon: React.ElementType; accent: string }[] = [
  { status: TaskStatus.TODO,        label: 'To Do',       icon: Circle,       accent: 'border-t-white/20' },
  { status: TaskStatus.IN_PROGRESS, label: 'In Progress', icon: Clock,        accent: 'border-t-white/40' },
  { status: TaskStatus.REVIEW,      label: 'Review',      icon: Eye,          accent: 'border-t-white/60' },
  { status: TaskStatus.DONE,        label: 'Done',        icon: CheckCircle2, accent: 'border-t-white/80' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  useEffect(() => {
    getTasksApi()
      .then(setTasks)
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleStatusChange = async (task: TaskWithRelations, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateTaskStatusApi(task.id, newStatus);
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
      toast.error('Failed to update task status');
    }
  };

  return (
    <PageWrapper title="Task Board">
      <div data-testid="tasks-page">
        <div className="flex justify-end mb-5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-xl text-sm font-medium transition-all border border-white/15"
          >
            <Plus size={15} />
            New Task
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(({ status, label, icon: Icon, accent }) => (
            <div key={status} className={clsx('glass rounded-2xl border-t-2 p-4 shadow-xl', accent)}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="opacity-60" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</h3>
                </div>
                <span className="text-xs opacity-40 glass px-2 py-0.5 rounded-full">
                  {tasks.filter((t) => t.status === status).length}
                </span>
              </div>
              <div className="space-y-3">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => <SkeletonLoader key={i} variant="card" />)
                  : tasks
                      .filter((t) => t.status === status)
                      .map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
              </div>
            </div>
          ))}
        </div>

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={(task) => { setTasks((prev) => [task, ...prev]); toast.success(`Task "${task.title}" created`); }}
        />

        {/* Task detail drawer */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={() => setSelectedTask(null)}>
            <div className="glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold">{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="opacity-50 hover:opacity-100 text-lg leading-none">×</button>
              </div>
              {selectedTask.description && (
                <p className="text-sm opacity-70 mb-4">{selectedTask.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-50">Assigned to</span>
                  <span>{selectedTask.assignedTo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Priority</span>
                  <span>{selectedTask.priority}</span>
                </div>
                {selectedTask.dueDate && (
                  <div className="flex justify-between">
                    <span className="opacity-50">Due</span>
                    <span>{new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <p className="text-xs opacity-50 uppercase tracking-widest mb-2">Move to</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(TaskStatus).filter((s) => s !== selectedTask.status).map((s) => (
                    <button key={s}
                      onClick={() => { void handleStatusChange(selectedTask, s); setSelectedTask(null); }}
                      className="px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-xs font-medium transition-all border border-white/15">
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
