import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id:      string;
  message: string;
  type:    ToastType;
}

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UiState {
  toasts:   ToastItem[];
  wsStatus: WsStatus;
}

const initialState: UiState = {
  toasts:   [],
  wsStatus: 'disconnected',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<ToastItem, 'id'>>) {
      // Deduplicate: don't stack identical messages
      const exists = state.toasts.some(
        (t) => t.message === action.payload.message && t.type === action.payload.type
      );
      if (!exists) {
        state.toasts.push({ ...action.payload, id: crypto.randomUUID() });
      }
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setWsStatus(state, action: PayloadAction<WsStatus>) {
      state.wsStatus = action.payload;
    },
  },
});

export const { addToast, removeToast, setWsStatus } = uiSlice.actions;
export default uiSlice.reducer;
