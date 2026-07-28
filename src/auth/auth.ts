import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import dotenv from 'dotenv';

dotenv.config();

export type AuthMode = 'disabled' | 'oauth2';

export interface AuthConfig {
  mode: AuthMode;
  issuer?: string;
  jwksUri?: string;
  audience?: string;
}

export function getAuthConfig(): AuthConfig {
  const mode = (process.env.AUTH_MODE || 'disabled').toLowerCase() as AuthMode;
  const issuer = process.env.OAUTH2_ISSUER || 'http://localhost:8080/realms/giramichi';
  const jwksUri = process.env.OAUTH2_JWKS_URI || `${issuer}/protocol/openid-connect/certs`;
  const audience = process.env.OAUTH2_AUDIENCE || undefined;

  return {
    mode,
    issuer,
    jwksUri,
    audience,
  };
}

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  const config = getAuthConfig();
  if (!JWKS) {
    if (!config.jwksUri) {
      throw new Error('[OAuth2 Auth] OAUTH2_JWKS_URI or OAUTH2_ISSUER environment variable must be specified.');
    }
    JWKS = createRemoteJWKSet(new URL(config.jwksUri));
  }
  return JWKS;
}

export interface AuthenticatedAgent {
  agentId: string;
  sub?: string;
  username?: string;
  clientId?: string;
  claims: JWTPayload;
}

export async function verifyOAuth2Token(token: string): Promise<AuthenticatedAgent> {
  const config = getAuthConfig();
  const jwks = getJWKS();

  const options: Record<string, any> = {};
  if (config.issuer) {
    options.issuer = config.issuer;
  }
  if (config.audience) {
    options.audience = config.audience;
  }

  const { payload } = await jwtVerify(token, jwks, options);

  const username = (payload.preferred_username || payload.username) as string | undefined;
  const clientId = (payload.client_id || payload.azp) as string | undefined;
  const sub = payload.sub as string | undefined;

  // Derive agent identifier for activity logging
  const agentId = username || clientId || sub || 'anonymous';

  return {
    agentId,
    sub,
    username,
    clientId,
    claims: payload,
  };
}
