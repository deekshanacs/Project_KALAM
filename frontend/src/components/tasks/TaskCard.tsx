import { Paperclip, MessageSquare } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { formatDate } from '../../utils/formatters';
import type { TaskWithRelations } from '@tms/shared';
import { Priority, TaskStatus } from '@tms/shared';
import { clsx } from 'clsx';

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  LOW:    { label: 'Low',    className: 'bg-white/5  text-gray-400 border-white/10' },
  MEDIUM: { label: 'Medium', className: 'bg-white/8  text-gray-300 border-white/15' },
  HIGH:   { label: 'High',   className: 'bg-white/12 text-gray-200 border-white/20' },
  URGENT: { label: 'Urgent', className: 'bg-white/18 text-white    border-white/30' },
};

interface TaskCardProps {
  task: TaskWithRelations;
  onClick: () => void;
  onStatusChange?: (task: TaskWithRelations, status: TaskStatus) => void;
}

export function TaskCard({ task, onClick, onStatusChange: _onStatusChange }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  return (
    <div
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className="glass rounded-xl p-4 cursor-pointer hover:bg-white/8 transition-all space-y-3 shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', priority.className)}>
          {priority.label}
        </span>
      </div>

      {task.dueDate && (
        <p className="text-xs opacity-40">Due {formatDate(task.dueDate)}</p>
      )}

      <div className="flex items-center justify-between">
        <Avatar src={task.assignedTo.avatarUrl} name={task.assignedTo.name} size="sm" />
        <div className="flex items-center gap-3 text-xs opacity-40">
          {(task.attachments?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Paperclip size={11} />{task.attachments.length}</span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-1"><MessageSquare size={11} />{task._count.comments}</span>
          )}
        </div>
      </div>
    </div>
  );
}


