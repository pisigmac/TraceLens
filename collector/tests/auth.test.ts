import { authMiddleware, generateToken, AuthenticatedRequest } from '../src/auth/jwt';
import { Response, NextFunction } from 'express';

function makeReq(headers: Record<string, string>): AuthenticatedRequest {
  return { headers } as AuthenticatedRequest;
}

function makeRes(): Response {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('authMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without an Authorization header', () => {
    const req = makeReq({});
    const res = makeRes();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization headers', () => {
    const req = makeReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const res = makeRes();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid generated token and attaches the user', () => {
    const token = generateToken({ sub: 'workspace-1', api_key: 'key-1', tier: 'metadata-only' });
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ sub: 'workspace-1', apiKey: 'key-1', tier: 'metadata-only' });
  });

  it('rejects an invalid token', () => {
    const req = makeReq({ authorization: 'Bearer invalid-token' });
    const res = makeRes();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
