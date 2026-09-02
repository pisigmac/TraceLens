import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: { sub: string; apiKey: string; tier: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, {
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    }) as { sub: string; api_key: string; tier: string };

    req.user = { sub: decoded.sub, apiKey: decoded.api_key, tier: decoded.tier };
    next();
  } catch (err) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

export function generateToken(payload: { sub: string; api_key: string; tier: string }): string {
  return jwt.sign(payload, config.auth.jwtSecret, {
    issuer: config.auth.jwtIssuer,
    audience: config.auth.jwtAudience,
    expiresIn: '24h',
  });
}
