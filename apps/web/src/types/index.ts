// Single source of truth lives in @taskflow/types.
// Re-export everything so existing src imports keep working.
export type {
  TaskStatus,
  TaskPriority,
  User,
  Member,
  Project,
  ProjectWithTasks,
  Task,
  ProjectStats,
  JwtPayload,
  AuthResponse,
  ApiError,
  CreateTaskPayload,
  UpdateTaskPayload,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '@taskflow/types';

export type {
  WsEvent,
  WsEventType,
  WsAuthPayload,
  WsSubscribePayload,
  WsTaskPayload,
  WsDeletePayload,
  WsProjectPayload,
} from '@taskflow/types';
