import type { Middleware, Dispatch, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { WsEvent } from '../../types';
import { wsTaskCreated, wsTaskUpdated, wsTaskDeleted } from '../slices/tasksSlice';
import { wsProjectUpdated } from '../slices/projectsSlice';
import { addToast, setWsStatus } from '../slices/uiSlice';

export const WS_CONNECT    = 'ws/connect';
export const WS_DISCONNECT = 'ws/disconnect';
export const WS_SUBSCRIBE  = 'ws/subscribe';

export const wsConnect    = (token: string)     => ({ type: WS_CONNECT,    payload: token });
export const wsDisconnect = ()                  => ({ type: WS_DISCONNECT,  payload: undefined });
export const wsSubscribe  = (projectId: string) => ({ type: WS_SUBSCRIBE,  payload: projectId });

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;
let reconnectDelay = 2_000;

// Compute WS URL once at module load
const WS_URL = (() => {
  const raw = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  return raw.replace(/^http/, 'ws');
})();

export const wsMiddleware: Middleware<Record<string, never>, RootState> =
  (store) => (next) => (action) => {
    const dispatch = store.dispatch as Dispatch<UnknownAction>;
    const typedAction = action as { type: string; payload?: unknown };

    switch (typedAction.type) {
      case WS_CONNECT: {
        if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) break;

        intentionalClose = false;
        dispatch(setWsStatus('connecting'));
        socket = new WebSocket(`${WS_URL}/ws`);

        socket.onopen = () => {
          reconnectDelay = 2_000;
          dispatch(setWsStatus('connected'));
          socket!.send(JSON.stringify({ type: 'auth', payload: { token: typedAction.payload } }));
        };

        socket.onmessage = (event) => {
          let msg: WsEvent;
          try { msg = JSON.parse(event.data as string) as WsEvent; }
          catch { return; }

          switch (msg.type) {
            case 'task.created':
              dispatch(wsTaskCreated((msg.payload as { task: Parameters<typeof wsTaskCreated>[0] }).task));
              dispatch(addToast({ message: 'New task added by a teammate', type: 'info' }));
              break;
            case 'task.updated':
              dispatch(wsTaskUpdated((msg.payload as { task: Parameters<typeof wsTaskUpdated>[0] }).task));
              break;
            case 'task.deleted':
              dispatch(wsTaskDeleted(msg.payload as Parameters<typeof wsTaskDeleted>[0]));
              dispatch(addToast({ message: 'A task was removed by a teammate', type: 'info' }));
              break;
            case 'project.updated':
              dispatch(wsProjectUpdated((msg.payload as { project: Parameters<typeof wsProjectUpdated>[0] }).project));
              break;
            default: break;
          }
        };

        socket.onclose = () => {
          socket = null;
          dispatch(setWsStatus('disconnected'));
          if (!intentionalClose) {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            const delay = reconnectDelay;
            reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              const token = localStorage.getItem('tf_token');
              if (token) dispatch(wsConnect(token) as UnknownAction);
            }, delay);
          }
        };

        socket.onerror = () => { dispatch(setWsStatus('error')); };
        break;
      }

      case WS_DISCONNECT: {
        intentionalClose = true;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        reconnectDelay = 2_000;
        socket?.close(1000, 'User logged out');
        socket = null;
        dispatch(setWsStatus('disconnected'));
        break;
      }

      case WS_SUBSCRIBE: {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'subscribe', payload: { projectId: typedAction.payload } }));
        }
        break;
      }

      default: break;
    }

    return next(action);
  };
