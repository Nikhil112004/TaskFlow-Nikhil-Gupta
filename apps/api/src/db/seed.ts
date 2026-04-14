import '../loadEnv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from './pool';
import logger from '../utils/logger';

async function seed() {
  logger.info('Starting database seed...');

  const seedUserId = uuidv4();
  const passwordHash = await bcrypt.hash('password123', 12);

  // Upsert seed user and always use the real persisted id.
  const userResult = await query<{ id: string }>(
    `INSERT INTO users (id, name, email, password, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name
     RETURNING id`,
    [seedUserId, 'Test User', 'test@example.com', passwordHash]
  );
  const userId = userResult.rows[0].id;

  // Reuse a stable project if it exists to keep seed idempotent.
  const existingProject = await query<{ id: string }>(
    `SELECT id FROM projects
     WHERE owner_id = $1 AND name = $2
     LIMIT 1`,
    [userId, 'Seed Project']
  );

  let projectId = existingProject.rows[0]?.id;
  if (!projectId) {
    const projectResult = await query<{ id: string }>(
      `INSERT INTO projects (id, name, description, owner_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [uuidv4(), 'Seed Project', 'A project seeded for testing', userId]
    );
    projectId = projectResult.rows[0].id;
  }

  // Seed tasks (skip if a same-title task already exists in this project).
  const statuses = ['todo', 'in_progress', 'done'] as const;
  const priorities = ['low', 'medium', 'high'] as const;
  const titles = ['Set up repository', 'Write API tests', 'Deploy to staging'];

  for (let i = 0; i < 3; i++) {
    const existingTask = await query<{ id: string }>(
      `SELECT id FROM tasks
       WHERE project_id = $1 AND title = $2
       LIMIT 1`,
      [projectId, titles[i]]
    );
    if (existingTask.rows.length > 0) continue;

    await query(
      `INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        uuidv4(),
        titles[i],
        `Description for task ${i + 1}`,
        statuses[i],
        priorities[i],
        projectId,
        userId,
        new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ]
    );
  }

  logger.info('Seed complete', {
    email: 'test@example.com',
    password: 'password123',
  });

  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', { error: err.message });
  process.exit(1);
});
