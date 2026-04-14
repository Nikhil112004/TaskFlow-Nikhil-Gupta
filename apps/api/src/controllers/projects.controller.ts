import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import type { Project } from '@taskflow/types';
import logger from '../utils/logger';
import { broadcastToProject } from '../ws/manager';

// Includes task_count + done_count so project cards can show progress
export async function listProjects(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  try {
    const result = await query<Project & { task_count: number; done_count: number }>(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at,
              COUNT(t.id)::int                                            AS task_count,
              COUNT(t.id) FILTER (WHERE t.status = 'done')::int          AS done_count
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.owner_id = $1
          OR p.id IN (SELECT DISTINCT project_id FROM tasks WHERE assignee_id = $1)
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    logger.error('List projects error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { name, description } = req.body;
  try {
    const id = uuidv4();
    const result = await query<Project>(
      `INSERT INTO projects (id, name, description, owner_id, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [id, name, description ?? null, userId]
    );
    logger.info('Project created', { projectId: id, userId });
    res.status(201).json({ ...result.rows[0], task_count: 0, done_count: 0 });
  } catch (err) {
    logger.error('Create project error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  try {
    const projectResult = await query<Project>(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)`,
      [id, userId]
    );
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const tasksResult = await query(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = $1 ORDER BY t.created_at ASC`,
      [id]
    );
    res.json({ ...projectResult.rows[0], tasks: tasksResult.rows });
  } catch (err) {
    logger.error('Get project error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const check = await query<Project>('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    if (check.rows[0].owner_id !== userId) { res.status(403).json({ error: 'forbidden' }); return; }

    const result = await query<Project>(
      `UPDATE projects SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name ?? null, description ?? null, id]
    );
    const updated = result.rows[0];

    // Broadcast to subscribers so other open tabs update immediately
    broadcastToProject(id, { type: 'project.updated', payload: { project: updated }, actorId: userId });
    logger.info('Project updated', { projectId: id, userId });
    res.json(updated);
  } catch (err) {
    logger.error('Update project error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  try {
    const check = await query<Project>('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    if (check.rows[0].owner_id !== userId) { res.status(403).json({ error: 'forbidden' }); return; }

    await query('DELETE FROM tasks WHERE project_id = $1', [id]);
    await query('DELETE FROM projects WHERE id = $1', [id]);
    logger.info('Project deleted', { projectId: id, userId });
    res.status(204).send();
  } catch (err) {
    logger.error('Delete project error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function getProjectStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  try {
    const check = await query<Project>(
      `SELECT DISTINCT p.id FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)`,
      [id, userId]
    );
    if (check.rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }

    const [byStatus, byAssignee] = await Promise.all([
      query(`SELECT status, COUNT(*)::int as count FROM tasks WHERE project_id = $1 GROUP BY status`, [id]),
      query(
        `SELECT u.id, u.name, COUNT(t.id)::int as count
         FROM tasks t JOIN users u ON u.id = t.assignee_id
         WHERE t.project_id = $1 GROUP BY u.id, u.name`,
        [id]
      ),
    ]);
    res.json({ by_status: byStatus.rows, by_assignee: byAssignee.rows });
  } catch (err) {
    logger.error('Project stats error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}
