import request from 'supertest';
import app from '../src/app';
import { query } from '../src/db/pool';

const email = `proj_test_${Date.now()}@example.com`;
const password = 'password123';
let token: string;
let userId: string;
let projectId: string;
let taskId: string;

beforeAll(async () => {
  const res = await request(app).post('/auth/register').send({
    name: 'Project Tester',
    email,
    password,
  });
  token = res.body.token;
  userId = res.body.user.id;
});

afterAll(async () => {
  await query('DELETE FROM users WHERE email = $1', [email]);
  await new Promise((r) => setTimeout(r, 200));
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Projects API', () => {
  it('GET /projects returns empty list for new user', async () => {
    const res = await request(app).get('/projects').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });

  it('POST /projects creates a project', async () => {
    const res = await request(app).post('/projects').set(auth()).send({
      name: 'Test Project',
      description: 'Integration test project',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Project');
    expect(res.body.owner_id).toBe(userId);
    projectId = res.body.id;
  });

  it('POST /projects returns 400 without name', async () => {
    const res = await request(app).post('/projects').set(auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.fields.name).toBeDefined();
  });

  it('GET /projects/:id returns project with tasks array', async () => {
    const res = await request(app).get(`/projects/${projectId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('PATCH /projects/:id updates project name', async () => {
    const res = await request(app)
      .patch(`/projects/${projectId}`)
      .set(auth())
      .send({ name: 'Updated Project' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Project');
  });

  it('GET /projects/:id/stats returns status breakdown', async () => {
    const res = await request(app).get(`/projects/${projectId}/stats`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.by_status)).toBe(true);
  });
});

describe('Tasks API', () => {
  it('POST /projects/:id/tasks creates a task', async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set(auth())
      .send({
        title: 'Integration task',
        description: 'Test description',
        priority: 'high',
        due_date: '2026-12-31',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Integration task');
    expect(res.body.status).toBe('todo');
    taskId = res.body.id;
  });

  it('GET /projects/:id/tasks lists tasks', async () => {
    const res = await request(app).get(`/projects/${projectId}/tasks`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThan(0);
  });

  it('GET /projects/:id/tasks filters by status', async () => {
    const res = await request(app)
      .get(`/projects/${projectId}/tasks?status=todo`)
      .set(auth());
    expect(res.status).toBe(200);
    res.body.tasks.forEach((t: { status: string }) => {
      expect(t.status).toBe('todo');
    });
  });

  it('PATCH /tasks/:id updates task status', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}`)
      .set(auth())
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('PATCH /tasks/:id returns 404 for unknown task', async () => {
    const res = await request(app)
      .patch('/tasks/00000000-0000-0000-0000-000000000000')
      .set(auth())
      .send({ status: 'done' });
    expect(res.status).toBe(404);
  });

  it('DELETE /tasks/:id removes the task', async () => {
    const res = await request(app).delete(`/tasks/${taskId}`).set(auth());
    expect(res.status).toBe(204);
  });
});

describe('Project deletion', () => {
  it('DELETE /projects/:id removes project and tasks', async () => {
    const res = await request(app).delete(`/projects/${projectId}`).set(auth());
    expect(res.status).toBe(204);
  });

  it('GET /projects/:id returns 404 after deletion', async () => {
    const res = await request(app).get(`/projects/${projectId}`).set(auth());
    expect(res.status).toBe(404);
  });
});
