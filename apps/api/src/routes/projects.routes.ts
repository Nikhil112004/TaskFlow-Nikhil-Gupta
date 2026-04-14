import { Router } from 'express';
import { body } from 'express-validator';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
} from '../controllers/projects.controller';
import { listTasks, createTask } from '../controllers/tasks.controller';
import { listProjectMembers } from '../controllers/users.controller';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', listProjects);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('is required')],
  validate,
  createProject
);

router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);
router.get('/:id/stats', getProjectStats);
router.get('/:id/members', listProjectMembers);

// Task sub-resource
router.get('/:id/tasks', listTasks);
router.post(
  '/:id/tasks',
  [body('title').trim().notEmpty().withMessage('is required')],
  validate,
  createTask
);

export default router;
