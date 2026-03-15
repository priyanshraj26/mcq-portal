import { clerkMiddleware, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

export const clerk = clerkMiddleware();

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

export const getUserId = (req: Request): string => {
  const { userId } = getAuth(req);
  if (!userId) throw new Error('No userId on authenticated request');
  return userId;
};
