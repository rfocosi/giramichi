import { Redis, RedisOptions } from 'ioredis';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let isConnected = false;

const sessionSubscribers = new Map<string, (message: any) => void>();

function getRedisOptions(): RedisOptions | string | null {
  const url = process.env.REDIS_URL;
  if (url) return url;

  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
  const password = process.env.REDIS_PASSWORD;

  if (host) {
    return { host, port, password: password || undefined, maxRetriesPerRequest: 3 };
  }

  return null;
}

export function initRedisAdapter(): void {
  const opts = getRedisOptions();
  if (!opts) {
    console.log('[Giramichi MCP Redis] No REDIS_URL or REDIS_HOST set. Running in standalone in-memory mode.');
    return;
  }

  try {
    pubClient = typeof opts === 'string' ? new Redis(opts) : new Redis(opts);
    subClient = typeof opts === 'string' ? new Redis(opts) : new Redis(opts);

    pubClient.on('connect', () => {
      console.log('[Giramichi MCP Redis] Publisher connected successfully.');
      isConnected = true;
    });

    pubClient.on('error', (err) => {
      console.warn('[Giramichi MCP Redis] Publisher error:', err.message);
      isConnected = false;
    });

    subClient.on('error', (err) => {
      console.warn('[Giramichi MCP Redis] Subscriber error:', err.message);
    });

    // Handle incoming Pub/Sub messages
    subClient.on('message', (channel, messageStr) => {
      const prefix = 'mcp:session:';
      if (channel.startsWith(prefix)) {
        const sessionId = channel.slice(prefix.length);
        const callback = sessionSubscribers.get(sessionId);
        if (callback) {
          try {
            const parsed = JSON.parse(messageStr);
            callback(parsed);
          } catch (e) {
            console.error(`[Giramichi MCP Redis] Failed to parse Pub/Sub message for session ${sessionId}:`, e);
          }
        }
      }
    });

    console.log('[Giramichi MCP Redis] Redis adapter initialized.');
  } catch (err: any) {
    console.warn('[Giramichi MCP Redis] Failed to initialize Redis clients. Falling back to local mode:', err.message);
  }
}

export function isRedisConnected(): boolean {
  return isConnected && pubClient?.status === 'ready' && subClient?.status === 'ready';
}

export async function publishSessionMessage(sessionId: string, message: any): Promise<boolean> {
  if (!pubClient || !isConnected) {
    return false;
  }

  try {
    const channel = `mcp:session:${sessionId}`;
    const payload = JSON.stringify(message);
    const receiversCount = await pubClient.publish(channel, payload);
    console.log(`[Giramichi MCP Redis] Published message to ${channel} (delivered to ${receiversCount} subscriber(s))`);
    return receiversCount > 0;
  } catch (err: any) {
    console.error(`[Giramichi MCP Redis] Error publishing message to session ${sessionId}:`, err.message);
    return false;
  }
}

export async function subscribeToSession(sessionId: string, onMessage: (message: any) => void): Promise<void> {
  sessionSubscribers.set(sessionId, onMessage);

  if (subClient && isConnected) {
    try {
      const channel = `mcp:session:${sessionId}`;
      await subClient.subscribe(channel);
      console.log(`[Giramichi MCP Redis] Subscribed to Redis channel: ${channel}`);
    } catch (err: any) {
      console.error(`[Giramichi MCP Redis] Error subscribing to session ${sessionId}:`, err.message);
    }
  }
}

export async function unsubscribeFromSession(sessionId: string): Promise<void> {
  sessionSubscribers.delete(sessionId);

  if (subClient && isConnected) {
    try {
      const channel = `mcp:session:${sessionId}`;
      await subClient.unsubscribe(channel);
      console.log(`[Giramichi MCP Redis] Unsubscribed from Redis channel: ${channel}`);
    } catch (err: any) {
      console.error(`[Giramichi MCP Redis] Error unsubscribing from session ${sessionId}:`, err.message);
    }
  }
}
