import type { JwtPayload } from '@taskflow/types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
