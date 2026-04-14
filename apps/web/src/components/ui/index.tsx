import { cn, getInitials } from '../../lib/utils';
import { Loader2 } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../../types';

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'outline' && 'border border-border text-foreground bg-transparent',
        variant === 'default' && 'bg-secondary text-secondary-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  done: { label: 'Done', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = statusConfig[status];
  return <Badge className={className}>{label}</Badge>;
}

// ── Priority Badge ────────────────────────────────────────────────────────────
const priorityConfig: Record<TaskPriority, { label: string; className: string; dot: string }> = {
  low: { label: 'Low', className: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  medium: { label: 'Medium', className: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
  high: { label: 'High', className: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, className, dot } = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 'sm', className }: { name: string; size?: 'sm' | 'md'; className?: string }) {
  const colors = [
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-rose-500', 'bg-orange-500',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        color,
        size === 'sm' && 'w-6 h-6 text-[10px]',
        size === 'md' && 'w-8 h-8 text-xs',
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} />;
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card text-card-foreground rounded-[1.5rem] border border-border/75 shadow-[0_12px_30px_-25px_hsl(var(--foreground)/0.45)]',
        onClick && 'cursor-pointer hover:border-primary/40 transition-all',
        className
      )}
    >
      {children}
    </div>
  );
}
