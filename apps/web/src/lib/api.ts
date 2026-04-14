/// <reference types="vite/client" />
import type { User, Member, Project, ProjectWithTasks, Task, ProjectStats, ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('tf_token');
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    const token = this.getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: this.headers(init?.headers as Record<string, string>),
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json();

    if (!res.ok) {
      const err = data as ApiError;
      throw Object.assign(new Error(err.error || 'Request failed'), {
        fields: err.fields,
        status: res.status,
      });
    }

    return data as T;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async register(name: string, email: string, password: string) {
    return this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  async getProjects() {
    return this.request<{ projects: Project[] }>('/projects');
  }

  async getProject(id: string) {
    return this.request<ProjectWithTasks>(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string }) {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; description?: string }) {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, { method: 'DELETE' });
  }

  async getProjectStats(id: string) {
    return this.request<ProjectStats>(`/projects/${id}/stats`);
  }

  async getProjectMembers(id: string) {
    return this.request<{ members: Member[] }>(`/projects/${id}/members`);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async getTasks(projectId: string, filters?: { status?: string; assignee?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.assignee) params.set('assignee', filters.assignee);
    const qs = params.toString() ? `?${params}` : '';
    return this.request<{ tasks: Task[] }>(`/projects/${projectId}/tasks${qs}`);
  }

  async createTask(
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee_id?: string;
      due_date?: string;
    }
  ) {
    return this.request<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee_id?: string | null;
      due_date?: string | null;
    }
  ) {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request<void>(`/tasks/${id}`, { method: 'DELETE' });
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async searchUsers(q: string) {
    return this.request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`);
  }
}

export const api = new ApiClient();
