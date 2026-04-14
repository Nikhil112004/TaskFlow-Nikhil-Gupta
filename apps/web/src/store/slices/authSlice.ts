import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { api } from '../../lib/api';

const TOKEN_KEY = 'tf_token';
const USER_KEY  = 'tf_user';

export interface AuthState {
  user:    User | null;
  token:   string | null;
  loading: boolean;
  error:   string | null;
}

const storedToken = localStorage.getItem(TOKEN_KEY);
const storedUser  = localStorage.getItem(USER_KEY);

const initialState: AuthState = {
  user:    storedUser  ? (JSON.parse(storedUser) as User) : null,
  token:   storedToken ?? null,
  loading: false,
  error:   null,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await api.login(email, password);
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    { name, email, password }: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.register(name, email, password);
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      state.user  = null;
      state.token = null;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state: AuthState) => {
      state.loading = true;
      state.error   = null;
    };
    const handleFulfilled = (
      state: AuthState,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.loading = false;
      state.token   = action.payload.token;
      state.user    = action.payload.user;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY,  JSON.stringify(action.payload.user));
    };
    const handleRejected = (state: AuthState, action: ReturnType<typeof loginThunk.rejected>) => {
      state.loading = false;
      state.error   = action.payload as string ?? 'Something went wrong';
    };

    builder
      .addCase(loginThunk.pending,    handlePending)
      .addCase(loginThunk.fulfilled,  handleFulfilled)
      .addCase(loginThunk.rejected,   handleRejected)
      .addCase(registerThunk.pending,   handlePending)
      .addCase(registerThunk.fulfilled, handleFulfilled)
      .addCase(registerThunk.rejected,  handleRejected);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
