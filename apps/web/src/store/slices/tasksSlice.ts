import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Task, TaskStatus } from '../../types';
import { api } from '../../lib/api';
import {
  incrementProjectTaskCount,
  decrementProjectTaskCount,
  updateProjectDoneCount,
} from './projectsSlice';

export interface TasksState {
  byProject: Record<string, Task[]>;
  loading:   boolean;
  error:     string | null;
}

const initialState: TasksState = { byProject: {}, loading: false, error: null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function upsertTask(tasks: Task[], task: Task): Task[] {
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) { const next = [...tasks]; next[idx] = task; return next; }
  return [task, ...tasks];
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const createTask = createAsyncThunk(
  'tasks/create',
  async (
    { projectId, data }: { projectId: string; data: Parameters<typeof api.createTask>[1] },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const task = await api.createTask(projectId, data);
      dispatch(incrementProjectTaskCount({ projectId, done: task.status === 'done' }));
      return task;
    } catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async (
    { id, data, previousStatus }: { id: string; data: Parameters<typeof api.updateTask>[1]; previousStatus?: TaskStatus },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      const task = await api.updateTask(id, data);
      // Update done_count on project card if status changed
      if (data.status && previousStatus && data.status !== previousStatus) {
        const projectId = task.project_id;
        const wasDone = previousStatus === 'done';
        const isDone  = data.status === 'done';
        if (!wasDone && isDone) dispatch(updateProjectDoneCount({ projectId, delta: +1 }));
        if (wasDone && !isDone) dispatch(updateProjectDoneCount({ projectId, delta: -1 }));
      }
      return task;
    } catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async ({ id, projectId }: { id: string; projectId: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      // Get the task before deleting to know if it was 'done'
      const state = (getState() as { tasks: TasksState }).tasks;
      const task  = state.byProject[projectId]?.find((t) => t.id === id);
      await api.deleteTask(id);
      dispatch(decrementProjectTaskCount({ projectId, wasDone: task?.status === 'done' }));
      return { id, projectId };
    } catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setProjectTasks(state, action: PayloadAction<{ projectId: string; tasks: Task[] }>) {
      state.byProject[action.payload.projectId] = action.payload.tasks;
    },

    // Optimistic status update — instant UI, roll back on API failure
    optimisticStatusUpdate(
      state,
      action: PayloadAction<{ taskId: string; projectId: string; status: TaskStatus }>
    ) {
      const { taskId, projectId, status } = action.payload;
      const tasks = state.byProject[projectId];
      if (!tasks) return;
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx >= 0) tasks[idx] = { ...tasks[idx], status };
    },

    // Kanban: reorder tasks within/across columns (optimistic, no API needed for order)
    reorderTasks(
      state,
      action: PayloadAction<{ projectId: string; tasks: Task[] }>
    ) {
      state.byProject[action.payload.projectId] = action.payload.tasks;
    },

    // ── WS event reducers ─────────────────────────────────────────────────
    wsTaskCreated(state, action: PayloadAction<Task>) {
      const { project_id } = action.payload;
      if (!state.byProject[project_id]) state.byProject[project_id] = [];
      if (!state.byProject[project_id].find((t) => t.id === action.payload.id))
        state.byProject[project_id].unshift(action.payload);
    },
    wsTaskUpdated(state, action: PayloadAction<Task>) {
      const { project_id } = action.payload;
      if (!state.byProject[project_id]) return;
      state.byProject[project_id] = upsertTask(state.byProject[project_id], action.payload);
    },
    wsTaskDeleted(state, action: PayloadAction<{ taskId: string; projectId: string }>) {
      const { taskId, projectId } = action.payload;
      if (!state.byProject[projectId]) return;
      state.byProject[projectId] = state.byProject[projectId].filter((t) => t.id !== taskId);
    },
  },
  extraReducers: (builder) => {
    builder
      // Loading state for task mutations (used by TaskModal submit button)
      .addCase(createTask.pending,  (s) => { s.loading = true;  s.error = null; })
      .addCase(updateTask.pending,  (s) => { s.loading = true;  s.error = null; })
      .addCase(deleteTask.pending,  (s) => { s.loading = true;  s.error = null; })
      .addCase(createTask.fulfilled, (s, a) => { s.loading = false;
        const { project_id } = a.payload;
        if (!s.byProject[project_id]) s.byProject[project_id] = [];
        s.byProject[project_id] = upsertTask(s.byProject[project_id], a.payload);
      })
      .addCase(updateTask.fulfilled, (s, a) => { s.loading = false;
        const { project_id } = a.payload;
        if (!s.byProject[project_id]) return;
        s.byProject[project_id] = upsertTask(s.byProject[project_id], a.payload);
      })
      .addCase(deleteTask.fulfilled, (s, a) => { s.loading = false;
        const { id, projectId } = a.payload;
        if (!s.byProject[projectId]) return;
        s.byProject[projectId] = s.byProject[projectId].filter((t) => t.id !== id);
      })
      .addCase(createTask.rejected, (s, a) => { s.error = a.payload as string; })
      .addCase(updateTask.rejected, (s, a) => { s.error = a.payload as string; })
      .addCase(deleteTask.rejected, (s, a) => { s.error = a.payload as string; });
  },
});

export const {
  setProjectTasks, optimisticStatusUpdate, reorderTasks,
  wsTaskCreated, wsTaskUpdated, wsTaskDeleted,
} = tasksSlice.actions;

export default tasksSlice.reducer;
