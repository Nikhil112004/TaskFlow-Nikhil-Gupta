import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Input, FormField, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/index';
import type { Task, Member } from '../../types';
import { UserPlus, X } from 'lucide-react';

// Payload shape passed up to the page — matches Redux thunk args exactly
export interface TaskSavePayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
}

interface TaskModalProps {
  open:      boolean;
  onClose:   () => void;
  onSaved:   (data: TaskSavePayload) => Promise<void>;
  projectId: string;
  task?:     Task | null;
  members?:  Member[];
}

interface TaskForm {
  title:       string;
  description: string;
  status:      string;
  priority:    string;
  assignee_id: string;
  due_date:    string;
}

const empty: TaskForm = {
  title: '', description: '', status: 'todo',
  priority: 'medium', assignee_id: '', due_date: '',
};

export default function TaskModal({ open, onClose, onSaved, task, members = [] }: TaskModalProps) {
  const isEdit = !!task;

  const [form,    setForm]    = useState<TaskForm>(empty);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(task ? {
        title:       task.title,
        description: task.description ?? '',
        status:      task.status,
        priority:    task.priority,
        assignee_id: task.assignee_id ?? '',
        due_date:    task.due_date ?? '',
      } : empty);
      setErrors({});
    }
  }, [open, task]);

  const set = useCallback(
    (k: keyof TaskForm) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [k]: e.target.value }));
        setErrors((p) => ({ ...p, [k]: '' }));
      },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setErrors({ title: 'Title is required' }); return; }

    setLoading(true);
    try {
      await onSaved({
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        status:      form.status,
        priority:    form.priority,
        assignee_id: form.assignee_id || undefined,
        due_date:    form.due_date    || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const e = err as Error & { fields?: Record<string, string> };
      if (e.fields) setErrors(e.fields);
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find((m) => m.id === form.assignee_id);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit task' : 'New task'} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Title" htmlFor="task-title">
          <Input id="task-title" placeholder="What needs to be done?" value={form.title}
            onChange={set('title')} error={errors.title} autoFocus />
        </FormField>

        <FormField label="Description (optional)" htmlFor="task-desc">
          <Textarea id="task-desc" placeholder="Add more context..." value={form.description}
            onChange={set('description')} rows={3} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Status" htmlFor="task-status">
            <Select id="task-status" value={form.status} onChange={set('status')}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </Select>
          </FormField>
          <FormField label="Priority" htmlFor="task-priority">
            <Select id="task-priority" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Assignee" htmlFor="task-assignee">
            <div className="flex items-center gap-2">
              <Select id="task-assignee" value={form.assignee_id} onChange={set('assignee_id')} className="flex-1">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              {selectedMember ? (
                <Avatar name={selectedMember.name} size="sm" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0">
                  <UserPlus className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Due date" htmlFor="task-due">
            <Input id="task-due" type="date" value={form.due_date} onChange={set('due_date')} />
          </FormField>
        </div>

        {form.assignee_id && (
          <button type="button" onClick={() => setForm((f) => ({ ...f, assignee_id: '' }))}
            className="self-start text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" /> Clear assignee
          </button>
        )}

        <div className="flex justify-end gap-2.5 pt-2 border-t border-border/70 mt-1">
          <Button size="sm" type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>{isEdit ? 'Save changes' : 'Create task'}</Button>
        </div>
      </form>
    </Modal>
  );
}
