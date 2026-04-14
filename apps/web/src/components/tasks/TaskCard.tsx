import { useState } from 'react';
import { StatusBadge, PriorityBadge, Avatar } from '../ui/index';
import { useAppDispatch } from '../../store';
import { optimisticStatusUpdate, updateTask } from '../../store/slices/tasksSlice';
import { addToast } from '../../store/slices/uiSlice';
import { cn, formatDate, isOverdue } from '../../lib/utils';
import type { Task, TaskStatus } from '../../types';
import { Pencil, Trash2, Calendar, ChevronDown } from 'lucide-react';

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'done'];

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;        // parent handles confirm dialog
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const dispatch = useAppDispatch();
  const [cycling, setCycling] = useState(false);
  const overdue = isOverdue(task.due_date, task.status);

  const cycleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
    const previousStatus = task.status;

    // Optimistic update
    dispatch(optimisticStatusUpdate({ taskId: task.id, projectId: task.project_id, status: nextStatus }));
    onStatusChange(task.id, nextStatus);
    setCycling(true);

    const result = await dispatch(updateTask({ id: task.id, data: { status: nextStatus }, previousStatus }));
    if (updateTask.rejected.match(result)) {
      // Revert
      dispatch(optimisticStatusUpdate({ taskId: task.id, projectId: task.project_id, status: previousStatus }));
      onStatusChange(task.id, previousStatus);
      dispatch(addToast({ message: 'Failed to update status', type: 'error' }));
    }
    setCycling(false);
  };

  return (
    <div className={cn(
      'group bg-card/92 border border-border/80 rounded-xl px-4 py-3.5',
      'hover:border-primary/35 hover:shadow-[0_16px_40px_-30px_hsl(var(--foreground)/0.55)] transition-all animate-fade-in',
      task.status === 'done' && 'opacity-70'
    )}>
      <div className="flex items-start gap-3">
        {/* Status dot — click to cycle */}
        <button
          onClick={cycleStatus}
          disabled={cycling}
          title="Cycle status"
          className={cn(
            'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all',
            'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            task.status === 'todo'        && 'border-muted-foreground',
            task.status === 'in_progress' && 'border-amber-500 bg-amber-500/20',
            task.status === 'done'        && 'border-emerald-500 bg-emerald-500',
            cycling && 'opacity-50'
          )}
        />

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-semibold text-foreground leading-snug',
            task.status === 'done' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            {task.due_date && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs',
                overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
              )}>
                <Calendar className="w-3 h-3" />{formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={cycleStatus}
            disabled={cycling}
            className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            title="Cycle status"
          >
            <StatusBadge status={task.status} />
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {task.assignee_name && <Avatar name={task.assignee_name} size="sm" />}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
