import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProjectDetail, clearCurrent, updateProject } from '../store/slices/projectsSlice';
import {
  setProjectTasks, createTask, updateTask, deleteTask, optimisticStatusUpdate,
} from '../store/slices/tasksSlice';
import { addToast } from '../store/slices/uiSlice';
import { wsSubscribe } from '../store/middleware/wsMiddleware';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Spinner, EmptyState, Avatar } from '../components/ui/index';
import TaskCard from '../components/tasks/TaskCard';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskModal from '../components/tasks/TaskModal';
import ProjectModal from '../components/projects/ProjectModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { Task, TaskStatus } from '../types';
import {
  Plus, ChevronLeft, ClipboardList, BarChart3,
  CheckCircle2, Clock, Circle, Pencil, LayoutList, Columns,
} from 'lucide-react';
import { cn } from '../lib/utils';

type FilterStatus = 'all' | TaskStatus;
type ViewMode = 'list' | 'kanban';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const project = useAppSelector((s) => s.projects.current);
  const members = useAppSelector((s) => s.projects.members);
  const stats   = useAppSelector((s) => s.projects.stats);
  const loading = useAppSelector((s) => s.projects.detailLoading);
  const tasks   = useAppSelector((s) => id ? (s.tasks.byProject[id] ?? []) : []);
  const user    = useAppSelector((s) => s.auth.user);

  const [taskModalOpen,   setTaskModalOpen]   = useState(false);
  const [editTask,        setEditTask]        = useState<Task | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [filterStatus,    setFilterStatus]    = useState<FilterStatus>('all');
  const [filterAssignee,  setFilterAssignee]  = useState('');
  const [showStats,       setShowStats]       = useState(false);
  const [viewMode,        setViewMode]        = useState<ViewMode>('list');
  const [deleteTaskId,    setDeleteTaskId]    = useState<string | null>(null);

  // Load project + subscribe to WS room
  useEffect(() => {
    if (!id) return;
    dispatch(fetchProjectDetail(id)).then((result) => {
      if (fetchProjectDetail.rejected.match(result))
        navigate('/projects', { replace: true });
    });
    dispatch(wsSubscribe(id));
    return () => { dispatch(clearCurrent()); };
  }, [id, dispatch, navigate]);

  // Sync tasks into tasks slice
  useEffect(() => {
    if (project && id) dispatch(setProjectTasks({ projectId: id, tasks: project.tasks ?? [] }));
  }, [project, id, dispatch]);

  if (loading) return <div className="flex justify-center py-32"><Spinner className="w-7 h-7" /></div>;
  if (!project) return null;

  const isOwner = project.owner_id === user?.id;
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterAssignee && t.assignee_id !== filterAssignee) return false;
    return true;
  });
  const statCount = (s: TaskStatus) => stats?.by_status.find((x: { status: TaskStatus; count: number }) => x.status === s)?.count ?? 0;

  const handleTaskSaved = async (data: Parameters<typeof createTask>[0]['data']) => {
    if (!id) return;
    if (editTask) {
      const result = await dispatch(updateTask({
        id: editTask.id, data, previousStatus: editTask.status,
      }));
      if (updateTask.rejected.match(result))
        dispatch(addToast({ message: 'Failed to update task', type: 'error' }));
      else dispatch(addToast({ message: 'Task updated', type: 'success' }));
    } else {
      const result = await dispatch(createTask({ projectId: id, data }));
      if (createTask.rejected.match(result))
        dispatch(addToast({ message: 'Failed to create task', type: 'error' }));
      else dispatch(addToast({ message: 'Task created', type: 'success' }));
    }
    setTaskModalOpen(false);
    setEditTask(null);
  };

  const handleTaskDeleteConfirm = async () => {
    if (!deleteTaskId || !id) return;
    const result = await dispatch(deleteTask({ id: deleteTaskId, projectId: id }));
    if (deleteTask.rejected.match(result))
      dispatch(addToast({ message: 'Failed to delete task', type: 'error' }));
    else dispatch(addToast({ message: 'Task deleted', type: 'success' }));
    setDeleteTaskId(null);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (!id) return;
    dispatch(optimisticStatusUpdate({ taskId, projectId: id, status: newStatus }));
  };

  const handleProjectSaved = async (data: { name: string; description?: string }) => {
    if (!id) return;
    const result = await dispatch(updateProject({ id, data }));
    if (updateProject.rejected.match(result))
      dispatch(addToast({ message: 'Failed to update project', type: 'error' }));
    else dispatch(addToast({ message: 'Project updated', type: 'success' }));
    setEditProjectOpen(false);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 sm:mb-8 rounded-2xl border border-border/70 bg-card/78 backdrop-blur p-5 sm:p-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All projects
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">{project.name}</h1>
              {isOwner && (
                <button
                  onClick={() => setEditProjectOpen(true)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Stats toggle */}
            <Button variant="outline" size="sm" onClick={() => setShowStats((v) => !v)}>
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{showStats ? 'Hide stats' : 'Stats'}</span>
            </Button>

            {/* View toggle */}
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                title="List view"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors border-l border-border',
                  viewMode === 'kanban'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                title="Kanban view"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {isOwner && (
              <Button size="sm" onClick={() => { setEditTask(null); setTaskModalOpen(true); }}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New task</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && stats && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <StatCard icon={<Circle className="w-4 h-4 text-muted-foreground" />} label="To do" value={statCount('todo')} total={tasks.length} />
          <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="In progress" value={statCount('in_progress')} total={tasks.length} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Done" value={statCount('done')} total={tasks.length} />
          <div className="bg-card/90 border border-border/80 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1.5">Members</p>
            <div className="flex -space-x-1.5">
              {members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.name} size="sm" className="ring-2 ring-card" />
              ))}
              {members.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters — only show in list mode */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-border/70 bg-card/72">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="w-32 h-8 text-xs"
          >
            <option value="all">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
          <Select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-32 h-8 text-xs"
          >
            <option value="">All assignees</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Task content area */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description={isOwner ? 'Create the first task for this project' : 'No tasks have been added yet'}
          action={isOwner ? (
            <Button size="sm" onClick={() => { setEditTask(null); setTaskModalOpen(true); }}>
              <Plus className="w-4 h-4" /> New task
            </Button>
          ) : undefined}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          projectId={project.id}
          onEdit={(t) => { setEditTask(t); setTaskModalOpen(true); }}
          onDelete={(taskId) => setDeleteTaskId(taskId)}
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks match your filters"
          description="Try adjusting the filters above"
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={(t) => { setEditTask(t); setTaskModalOpen(true); }}
              onDelete={(taskId) => setDeleteTaskId(taskId)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(null); }}
        onSaved={handleTaskSaved}
        projectId={project.id}
        task={editTask}
        members={members}
      />
      <ProjectModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        onSaved={handleProjectSaved}
        project={project}
      />
      <ConfirmDialog
        open={!!deleteTaskId}
        title="Delete task"
        message="Are you sure you want to delete this task? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleTaskDeleteConfirm}
        onCancel={() => setDeleteTaskId(null)}
      />
    </>
  );
}

function StatCard({ icon, label, value, total }: {
  icon: React.ReactNode; label: string; value: number; total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{pct}%</p>
    </div>
  );
}
