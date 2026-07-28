import { Request, Response, NextFunction } from 'express';
import { getAuthConfig, verifyOAuth2Token, AuthenticatedAgent } from './auth.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      agent?: AuthenticatedAgent;
    }
  }
}

export async function authenticateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const config = getAuthConfig();

  // If Auth is disabled
  if (config.mode === 'disabled') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const agent = await verifyOAuth2Token(token);
        req.agentId = agent.agentId;
        req.agent = agent;
      } catch {
        req.agentId = (req.headers['x-agent-id'] as string) || 'anonymous';
      }
    } else {
      req.agentId = (req.headers['x-agent-id'] as string) || 'anonymous';
    }
    return next();
  }

  // If Auth is OAuth2
  if (config.mode === 'oauth2') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Authorization header with Bearer token is required.',
      });
      return;
    }

    const token = authHeader.substring(7);
    try {
      const agent = await verifyOAuth2Token(token);
      req.agentId = agent.agentId;
      req.agent = agent;
      return next();
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: `Unauthorized: Token verification failed (${err.message}).`,
      });
      return;
    }
  }

  // Fallback for unknown auth mode
  req.agentId = 'anonymous';
  next();
}
