// useAuth now reads from Redux store instead of local context.
// The API is kept identical so no component imports need to change.
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { loginThunk, registerThunk, logout as logoutAction } from '../store/slices/authSlice';
import { wsConnect, wsDisconnect } from '../store/middleware/wsMiddleware';

export function useAuth() {
  const dispatch    = useAppDispatch();
  const navigate    = useNavigate();
  const user        = useAppSelector((s) => s.auth.user);
  const token       = useAppSelector((s) => s.auth.token);
  const loading     = useAppSelector((s) => s.auth.loading);
  const error       = useAppSelector((s) => s.auth.error);

  const login = useCallback(async (email: string, password: string) => {
    const result = await dispatch(loginThunk({ email, password }));
    if (loginThunk.fulfilled.match(result)) {
      dispatch(wsConnect(result.payload.token));
    } else {
      throw Object.assign(new Error(result.payload as string), { fields: {} });
    }
  }, [dispatch]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await dispatch(registerThunk({ name, email, password }));
    if (registerThunk.fulfilled.match(result)) {
      dispatch(wsConnect(result.payload.token));
    } else {
      throw Object.assign(new Error(result.payload as string), { fields: {} });
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(wsDisconnect());
    dispatch(logoutAction());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  return { user, token, loading, error, login, register, logout };
}

// Keep AuthProvider as a no-op shim — Provider is now <Provider store={store}> in main.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
