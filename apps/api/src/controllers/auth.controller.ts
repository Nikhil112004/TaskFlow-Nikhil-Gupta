import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import type { User } from '@taskflow/types';
import logger from '../utils/logger';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '24h';

// DB row includes password hash — never part of the public User response type
interface DbUser extends User {
  password: string;
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  try {
    const existing = await query<User>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({
        error: 'validation failed',
        fields: { email: 'already in use' },
      });
      return;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = uuidv4();

    const result = await query<User>(
      `INSERT INTO users (id, name, email, password, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, email, created_at`,
      [id, name, email, hashed]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { user_id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_EXPIRY }
    );

    logger.info('User registered', { userId: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) {
    logger.error('Register error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const result = await query<DbUser>(
      'SELECT id, name, email, password, created_at FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_EXPIRY }
    );

    logger.info('User logged in', { userId: user.id });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    logger.error('Login error', { error: (err as Error).message });
    res.status(500).json({ error: 'internal server error' });
  }
}
