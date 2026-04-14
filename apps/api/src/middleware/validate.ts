import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fields: Record<string, string> = {};
    errors.array().forEach((err) => {
      if (err.type === 'field') {
        fields[err.path] = err.msg;
      }
    });
    res.status(400).json({ error: 'validation failed', fields });
    return;
  }
  next();
}
