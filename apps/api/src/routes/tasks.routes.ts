import { Router } from 'express';
import { updateTask, deleteTask } from '../controllers/tasks.controller';

const router = Router();

router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
