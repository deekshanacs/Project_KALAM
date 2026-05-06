import { useState, type FormEvent, useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Priority } from '@tms/shared';
import { createTaskApi } from '../../api/tasks.api';
import { getUsersApi } from '../../api/users.api';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import type { TaskWithRelations, User } from '@tms/shared';
import toast from 'react-hot-toast';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (task: TaskWithRelations) => void;
}

export function TaskModal({ isOpen, onClose, onCreated }: TaskModalProps) {
  const { user: _user } = useAuth();
  const { canAssignTask } = usePermissions();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) getUsersApi().then(setUsers).catch(() => undefined);
  }, [isOpen]);

  // Include all users the current user can assign to (including self for Admin)
  const eligibleAssignees = users.filter((u) => canAssignTask(u.role));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignedToId) { toast.error('Please select an assignee'); return; }
    setIsLoading(true);
    try {
      const task = await createTaskApi({ title, description, priority, dueDate: dueDate || null, assignedToId });
      onCreated(task);
      onClose();
      setTitle(''); setDescription(''); setPriority(Priority.MEDIUM); setDueDate(''); setAssignedToId('');
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = 'w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 pb-2 text-white text-sm focus:outline-none transition-colors placeholder-gray-600';
  const selectCls = 'w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 transition-colors';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            data-testid="task-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-strong rounded-2xl p-7 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Create Task</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Title *</label>
                  <input data-testid="task-title-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                    placeholder="Task title" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    placeholder="Optional description" className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={selectCls}>
                      {Object.values(Priority).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={selectCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Assign To *</label>
                  <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={selectCls}>
                    <option value="">Select assigneeâ€¦</option>
                    {eligibleAssignees.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <button data-testid="task-submit-btn" type="submit" disabled={isLoading}
                  className="w-full py-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-black font-semibold rounded-xl text-sm tracking-wide transition-all">
                  {isLoading ? 'Creatingâ€¦' : 'Create Task'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

