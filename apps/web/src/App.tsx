import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store';
import { wsConnect } from './store/middleware/wsMiddleware';
import Layout from './components/layout/Layout';
import { Spinner } from './components/ui/index';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="w-5 h-5" />
        Loading...
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user    = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  if (loading) return <RouteLoadingFallback />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const user    = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  if (loading) return <RouteLoadingFallback />;
  return !user ? <>{children}</> : <Navigate to="/projects" replace />;
}

export default function App() {
  const dispatch = useAppDispatch();
  const token    = useAppSelector((s) => s.auth.token);

  // Re-connect WebSocket whenever the app mounts with a stored token
  // (covers page refresh — token is rehydrated from localStorage in authSlice initialState)
  useEffect(() => {
    if (token) dispatch(wsConnect(token));
  }, [dispatch, token]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route
        path="/projects"
        element={<ProtectedRoute><Layout><ProjectsPage /></Layout></ProtectedRoute>}
      />
      <Route
        path="/projects/:id"
        element={<ProtectedRoute><Layout><ProjectDetailPage /></Layout></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
