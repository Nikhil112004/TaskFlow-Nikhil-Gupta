// ── Enums ─────────────────────────────────────────────────────────────────────
export type TaskStatus   = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

// ── Domain models ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  // Included by listProjects for card progress display
  task_count?: number;
  done_count?: number;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  assignee_id: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  by_status:   { status: TaskStatus; count: number }[];
  by_assignee: { id: string; name: string; count: number }[];
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  user_id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Task mutation payloads ─────────────────────────────────────────────────────
export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface CreateProjectPayload { name: string; description?: string; }
export interface UpdateProjectPayload { name?: string; description?: string; }

// ── WebSocket event types ─────────────────────────────────────────────────────
export type WsEventType =
  | 'task.created' | 'task.updated' | 'task.deleted'
  | 'project.updated' | 'member.joined'
  | 'ping' | 'pong' | 'auth' | 'subscribe';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  projectId?: string;
  actorId?: string;
  timestamp: string;
}

export interface WsAuthPayload     { token: string; }
export interface WsSubscribePayload { projectId: string; }
export interface WsTaskPayload     { task: Task; }
export interface WsDeletePayload   { taskId: string; projectId: string; }
export interface WsProjectPayload  { project: Project; }
