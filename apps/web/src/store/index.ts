import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer     from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import tasksReducer    from './slices/tasksSlice';
import uiReducer       from './slices/uiSlice';
import { wsMiddleware } from './middleware/wsMiddleware';

// Build reducer map first so RootState can be derived without circularity
const rootReducer = {
  auth:     authReducer,
  projects: projectsReducer,
  tasks:    tasksReducer,
  ui:       uiReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(wsMiddleware),
});

// Derive types from the reducer map — avoids circular reference
export type RootState   = { [K in keyof typeof rootReducer]: ReturnType<(typeof rootReducer)[K]> };
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
