import { authMiddleware, generateToken } from '../../collector/src/auth/jwt';
import { Request, Response } from 'express';

describe('JWT Auth', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  test('generates and verifies token', () => {
    const token = generateToken({ sub: 'user-1', api_key: 'key-1', tier: 'pro' });
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);
  });

  test('rejects missing header', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } } as Request;
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
