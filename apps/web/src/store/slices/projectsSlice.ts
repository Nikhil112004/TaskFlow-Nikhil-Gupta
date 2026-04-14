import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Project, ProjectWithTasks, ProjectStats, Member } from '../../types';
import { api } from '../../lib/api';

export interface ProjectsState {
  list:          Project[];
  current:       ProjectWithTasks | null;
  members:       Member[];
  stats:         ProjectStats | null;
  loading:       boolean;
  detailLoading: boolean;
  error:         string | null;
}

const initialState: ProjectsState = {
  list: [], current: null, members: [], stats: null,
  loading: false, detailLoading: false, error: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchProjects = createAsyncThunk('projects/fetchAll', async (_, { rejectWithValue }) => {
  try { return (await api.getProjects()).projects; }
  catch (err: unknown) { return rejectWithValue((err as Error).message); }
});

export const fetchProjectDetail = createAsyncThunk('projects/fetchDetail', async (id: string, { rejectWithValue }) => {
  try {
    const [project, { members }, stats] = await Promise.all([
      api.getProject(id),
      api.getProjectMembers(id),
      api.getProjectStats(id),
    ]);
    return { project, members, stats };
  } catch (err: unknown) { return rejectWithValue((err as Error).message); }
});

export const createProject = createAsyncThunk('projects/create',
  async (data: { name: string; description?: string }, { rejectWithValue }) => {
    try { return await api.createProject(data); }
    catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

export const updateProject = createAsyncThunk('projects/update',
  async ({ id, data }: { id: string; data: { name?: string; description?: string } }, { rejectWithValue }) => {
    try { return await api.updateProject(id, data); }
    catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

export const deleteProject = createAsyncThunk('projects/delete',
  async (id: string, { rejectWithValue }) => {
    try { await api.deleteProject(id); return id; }
    catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
      state.members = [];
      state.stats   = null;
      state.error   = null;
    },
    // WS: project name/description changed by another user
    wsProjectUpdated(state, action: PayloadAction<Project>) {
      const idx = state.list.findIndex((p) => p.id === action.payload.id);
      if (idx >= 0) state.list[idx] = { ...state.list[idx], ...action.payload };
      if (state.current?.id === action.payload.id)
        state.current = { ...state.current, ...action.payload };
    },
    // Called by tasksSlice after task creation to bump project card counter
    incrementProjectTaskCount(state, action: PayloadAction<{ projectId: string; done: boolean }>) {
      const p = state.list.find((p) => p.id === action.payload.projectId);
      if (p) {
        p.task_count = (p.task_count ?? 0) + 1;
        if (action.payload.done) p.done_count = (p.done_count ?? 0) + 1;
      }
    },
    decrementProjectTaskCount(state, action: PayloadAction<{ projectId: string; wasDone: boolean }>) {
      const p = state.list.find((p) => p.id === action.payload.projectId);
      if (p) {
        p.task_count = Math.max(0, (p.task_count ?? 1) - 1);
        if (action.payload.wasDone) p.done_count = Math.max(0, (p.done_count ?? 1) - 1);
      }
    },
    updateProjectDoneCount(state, action: PayloadAction<{ projectId: string; delta: number }>) {
      const p = state.list.find((p) => p.id === action.payload.projectId);
      if (p) p.done_count = Math.max(0, (p.done_count ?? 0) + action.payload.delta);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending,    (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchProjects.fulfilled,  (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchProjects.rejected,   (s, a) => { s.loading = false; s.error = a.payload as string; })

      .addCase(fetchProjectDetail.pending,   (s) => { s.detailLoading = true;  s.error = null; })
      .addCase(fetchProjectDetail.fulfilled, (s, a) => {
        s.detailLoading = false;
        s.current = a.payload.project;
        s.members = a.payload.members;
        s.stats   = a.payload.stats;
      })
      .addCase(fetchProjectDetail.rejected,  (s, a) => { s.detailLoading = false; s.error = a.payload as string; })

      .addCase(createProject.fulfilled, (s, a) => { s.list.unshift(a.payload); })
      .addCase(updateProject.fulfilled, (s, a) => {
        const idx = s.list.findIndex((p) => p.id === a.payload.id);
        if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload };
        if (s.current?.id === a.payload.id) s.current = { ...s.current, ...a.payload };
      })
      .addCase(deleteProject.fulfilled, (s, a) => {
        s.list    = s.list.filter((p) => p.id !== a.payload);
        if (s.current?.id === a.payload) s.current = null;
      });
  },
});

export const {
  clearCurrent, wsProjectUpdated,
  incrementProjectTaskCount, decrementProjectTaskCount, updateProjectDoneCount,
} = projectsSlice.actions;
export default projectsSlice.reducer;
