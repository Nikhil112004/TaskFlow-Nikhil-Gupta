import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProjects, createProject, updateProject, deleteProject } from '../store/slices/projectsSlice';
import { addToast } from '../store/slices/uiSlice';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, Spinner } from '../components/ui/index';
import ProjectModal from '../components/projects/ProjectModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { Project } from '../types';
import { FolderOpen, Plus, Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProjectsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const projects = useAppSelector((s) => s.projects.list);
  const loading  = useAppSelector((s) => s.projects.loading);
  const error    = useAppSelector((s) => s.projects.error);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editProject,  setEditProject]  = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  useEffect(() => { dispatch(fetchProjects()); }, [dispatch]);

  // Show fetch error inline
  useEffect(() => {
    if (error) dispatch(addToast({ message: error, type: 'error' }));
  }, [error, dispatch]);

  const handleSaved = async (data: { name: string; description?: string }) => {
    if (editProject) {
      const r = await dispatch(updateProject({ id: editProject.id, data }));
      if (updateProject.rejected.match(r))
        dispatch(addToast({ message: 'Failed to update project', type: 'error' }));
      else dispatch(addToast({ message: 'Project updated', type: 'success' }));
    } else {
      const r = await dispatch(createProject(data));
      if (createProject.rejected.match(r))
        dispatch(addToast({ message: 'Failed to create project', type: 'error' }));
      else dispatch(addToast({ message: 'Project created', type: 'success' }));
    }
    setModalOpen(false);
    setEditProject(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    const result = await dispatch(deleteProject(deleteTarget.id));
    if (deleteProject.rejected.match(result))
      dispatch(addToast({ message: 'Failed to delete project', type: 'error' }));
    else dispatch(addToast({ message: 'Project deleted', type: 'success' }));
    setDeletingId(null);
    setDeleteTarget(null);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="mb-6 sm:mb-8 rounded-2xl border border-border/70 bg-card/75 backdrop-blur p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Workspace</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditProject(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> New project
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner className="w-6 h-6" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project to start tracking tasks"
          action={
            <Button size="sm" onClick={() => { setEditProject(null); setModalOpen(true); }}>
              <Plus className="w-4 h-4" /> New project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const total = project.task_count ?? 0;
            const done  = project.done_count ?? 0;
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Card
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group p-5 sm:p-6 flex flex-col gap-4 animate-fade-in border-border/80 bg-card/90 hover:shadow-[0_20px_55px_-38px_hsl(var(--foreground)/0.45)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground text-base truncate">{project.name}</h2>
                    {project.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditProject(project); setModalOpen(true); }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit project"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                      disabled={deletingId === project.id}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Task progress bar */}
                <div className="mt-auto">
                  {total > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{done}/{total} tasks</span>
                        <span className={cn('text-xs font-semibold', pct === 100 ? 'text-emerald-600' : 'text-muted-foreground')}>
                          {pct === 100
                            ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Complete</span>
                            : `${pct}%`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            pct === 100 ? 'bg-emerald-500' : 'bg-primary'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Created {fmt(project.created_at)}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProject(null); }}
        onSaved={handleSaved}
        project={editProject}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name ?? ''}"`}
        message="This will permanently delete the project and all its tasks. This cannot be undone."
        confirmLabel="Delete project"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
