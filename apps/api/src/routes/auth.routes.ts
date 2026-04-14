import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('is required'),
    body('email').isEmail().normalizeEmail().withMessage('must be a valid email'),
    body('password').isLength({ min: 8 }).withMessage('must be at least 8 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('must be a valid email'),
    body('password').notEmpty().withMessage('is required'),
  ],
  validate,
  login
);

export default router;
