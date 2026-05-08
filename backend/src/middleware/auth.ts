import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

function jwtSecret() {
  const value = process.env.JWT_SECRET || '';
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return 'leadpulse-local-dev-jwt-secret';
}

const JWT_SECRET = jwtSecret();

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        plan: true,
        credits: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
