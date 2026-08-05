import type { Request, Response, NextFunction } from 'express';
import { getAuthConfig, verifyOAuth2Token, AuthenticatedAgent, getAnonymousAuthContext } from './auth.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      agent?: AuthenticatedAgent;
      createdBy?: string | number;
      lastUpdatedBy?: string | number;
      userContext?: { userId: string | number; user: string };
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
        req.createdBy = agent.createdBy ?? 0;
        req.lastUpdatedBy = agent.lastUpdatedBy ?? 0;
        req.userContext = { userId: agent.userId ?? 0, user: agent.user || 'anonymous' };
        return next();
      } catch {
        // Fallback to anonymous default when token verification fails in disabled mode
      }
    }

    const anonAgent = getAnonymousAuthContext();
    const customAgentId = req.headers['x-agent-id'] as string;
    if (customAgentId) {
      anonAgent.agentId = customAgentId;
    }
    req.agentId = anonAgent.agentId;
    req.agent = anonAgent;
    req.createdBy = 0;
    req.lastUpdatedBy = 0;
    req.userContext = { userId: 0, user: 'anonymous' };
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
      req.createdBy = agent.createdBy ?? 0;
      req.lastUpdatedBy = agent.lastUpdatedBy ?? 0;
      req.userContext = { userId: agent.userId ?? 0, user: agent.user || 'anonymous' };
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
  const anonAgent = getAnonymousAuthContext();
  req.agentId = 'anonymous';
  req.agent = anonAgent;
  req.createdBy = 0;
  req.lastUpdatedBy = 0;
  req.userContext = { userId: 0, user: 'anonymous' };
  next();
}
