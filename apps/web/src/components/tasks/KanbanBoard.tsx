import { useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch } from '../../store';
import { optimisticStatusUpdate, reorderTasks, updateTask } from '../../store/slices/tasksSlice';
import { addToast } from '../../store/slices/uiSlice';
import { StatusBadge, PriorityBadge, Avatar } from '../ui/index';
import { cn, formatDate, isOverdue } from '../../lib/utils';
import type { Task, TaskStatus } from '../../types';
import { GripVertical, Pencil, Trash2, Calendar } from 'lucide-react';

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; accent: string }[] = [
  { id: 'todo',        label: 'To Do',       accent: 'border-t-slate-400' },
  { id: 'in_progress', label: 'In Progress',  accent: 'border-t-amber-500' },
  { id: 'done',        label: 'Done',         accent: 'border-t-emerald-500' },
];

// ── Sortable Task Card ─────────────────────────────────────────────────────────
interface SortableTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

function SortableTaskCard({ task, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 shadow-sm',
        'hover:border-primary/30 hover:shadow-md transition-all',
        isDragging && 'ring-2 ring-primary shadow-xl'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium text-foreground leading-snug',
            task.status === 'done' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>

          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.due_date && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs',
                overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
              )}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>

          {task.assignee_name && (
            <div className="mt-2 flex items-center gap-1.5">
              <Avatar name={task.assignee_name} size="sm" />
              <span className="text-xs text-muted-foreground truncate">{task.assignee_name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Column droppable area ─────────────────────────────────────────────────────
function KanbanColumn({
  column,
  tasks,
  onEdit,
  onDelete,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <div className={cn(
      'flex flex-col bg-muted/40 dark:bg-muted/20 rounded-xl border-t-2 min-h-[400px]',
      column.accent
    )}>
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={column.id} />
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-3 pb-3 flex-1">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-lg min-h-[80px]">
              <p className="text-xs text-muted-foreground">Drop tasks here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────
interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function KanbanBoard({ tasks, projectId, onEdit, onDelete }: KanbanBoardProps) {
  const dispatch = useAppDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine target column from over id (could be column id or task id)
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = (overTask?.status ?? over.id) as TaskStatus;

    if (activeTask.status !== targetStatus) {
      // Cross-column: optimistically move to new status
      dispatch(optimisticStatusUpdate({ taskId: activeTask.id, projectId, status: targetStatus }));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = (overTask?.status ?? over.id) as TaskStatus;

    // If status changed — call API
    if (activeTask.status !== targetStatus || active.id === over.id) {
      // Reorder within same column
      if (activeTask.status === targetStatus && active.id !== over.id) {
        const columnTasks = getTasksByStatus(targetStatus);
        const oldIdx = columnTasks.findIndex((t) => t.id === active.id);
        const newIdx = columnTasks.findIndex((t) => t.id === over.id);
        const reordered = arrayMove(columnTasks, oldIdx, newIdx);
        // Merge reordered column back into full task list
        const otherTasks = tasks.filter((t) => t.status !== targetStatus);
        dispatch(reorderTasks({ projectId, tasks: [...otherTasks, ...reordered] }));
        return;
      }

      // Cross-column: the status was already optimistically updated in dragOver
      // Now persist it via API
      const previousStatus = activeTask.status;
      const currentTask = tasks.find((t) => t.id === active.id);
      const newStatus = currentTask?.status ?? targetStatus;

      const result = await dispatch(updateTask({
        id: activeTask.id,
        data: { status: newStatus },
        previousStatus,
      }));

      if (updateTask.rejected.match(result)) {
        // Revert the optimistic update
        dispatch(optimisticStatusUpdate({ taskId: activeTask.id, projectId, status: previousStatus }));
        dispatch(addToast({ message: 'Failed to move task', type: 'error' }));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={getTasksByStatus(col.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
