import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import type { Task } from '@taskflow/types';
import logger from '../utils/logger';
import { broadcastToProject } from '../ws/manager';

const TASK_SELECT = `
  SELECT t.*, u.name as assignee_name, u.email as assignee_email
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assignee_id
`;

export async function listTasks(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id: projectId } = req.params;
  const { status, assignee } = req.query;

  try {
    const access = await query(
      `SELECT DISTINCT p.id FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)`,
      [projectId, userId]
    );
    if (access.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }

    const conditions: string[] = ['t.project_id = $1'];
    const params: unknown[] = [projectId];
    let idx = 2;
    if (status)   { conditions.push(`t.status = $${idx++}`);      params.push(status); }
    if (assignee) { conditions.push(`t.assignee_id = $${idx++}`); params.push(assignee); }

    const result = await query(
      `${TASK_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY t.created_at ASC`,
      params
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    logger.error('List tasks error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id: projectId } = req.params;
  const { title, description, priority, assignee_id, due_date, status } = req.body;

  try {
    const project = await query('SELECT id, owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    if (project.rows[0].owner_id !== userId) { res.status(403).json({ error: 'forbidden' }); return; }

    const id = uuidv4();
    await query(
      `INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [id, title, description ?? null, status ?? 'todo', priority ?? 'medium',
       projectId, assignee_id ?? null, due_date ?? null]
    );

    const full = await query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    const task = full.rows[0];

    // Broadcast to all project subscribers (except creator)
    broadcastToProject(projectId, { type: 'task.created', payload: { task }, actorId: userId });

    logger.info('Task created', { taskId: id, projectId, userId });
    res.status(201).json(task);
  } catch (err) {
    logger.error('Create task error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  try {
    const taskResult = await query<Task & { owner_id: string }>(
      `SELECT t.*, p.owner_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`,
      [id]
    );
    if (taskResult.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    const task = taskResult.rows[0];
    if (task.owner_id !== userId && task.assignee_id !== userId) {
      res.status(403).json({ error: 'forbidden' }); return;
    }

    await query(
      `UPDATE tasks SET
         title       = COALESCE($1, title),
         description = COALESCE($2, description),
         status      = COALESCE($3, status),
         priority    = COALESCE($4, priority),
         assignee_id = CASE WHEN $5::text IS NOT NULL THEN $5::uuid ELSE assignee_id END,
         due_date    = COALESCE($6, due_date),
         updated_at  = NOW()
       WHERE id = $7`,
      [title ?? null, description ?? null, status ?? null, priority ?? null,
       assignee_id ?? null, due_date ?? null, id]
    );

    const full = await query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    const updated = full.rows[0];

    // Broadcast to all project subscribers
    broadcastToProject(task.project_id, {
      type: 'task.updated',
      payload: { task: updated },
      actorId: userId,
    });

    res.json(updated);
  } catch (err) {
    logger.error('Update task error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;

  try {
    const taskResult = await query<Task & { owner_id: string }>(
      `SELECT t.*, p.owner_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`,
      [id]
    );
    if (taskResult.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    const task = taskResult.rows[0];
    if (task.owner_id !== userId && task.assignee_id !== userId) {
      res.status(403).json({ error: 'forbidden' }); return;
    }

    const projectId = task.project_id;
    await query('DELETE FROM tasks WHERE id = $1', [id]);

    // Broadcast deletion to all project subscribers
    broadcastToProject(projectId, {
      type: 'task.deleted',
      payload: { taskId: id, projectId },
      actorId: userId,
    });

    logger.info('Task deleted', { taskId: id, userId });
    res.status(204).send();
  } catch (err) {
    logger.error('Delete task error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}
