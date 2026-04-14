import { Request, Response } from 'express';
import { query } from '../db/pool';
import logger from '../utils/logger';

export async function listProjectMembers(req: Request, res: Response): Promise<void> {
  const { id: projectId } = req.params;
  const userId = req.user!.user_id;

  try {
    // Return owner + all assignees for the project
    const result = await query(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM users u
       WHERE u.id = (SELECT owner_id FROM projects WHERE id = $1)
          OR u.id IN (SELECT assignee_id FROM tasks WHERE project_id = $1 AND assignee_id IS NOT NULL)
          OR u.id = $2
       ORDER BY u.name`,
      [projectId, userId]
    );
    res.json({ members: result.rows });
  } catch (err) {
    logger.error('List members error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    res.json({ users: [] });
    return;
  }
  try {
    const result = await query(
      `SELECT id, name, email FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10`,
      [`%${q}%`]
    );
    res.json({ users: result.rows });
  } catch (err) {
    logger.error('Search users error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}
