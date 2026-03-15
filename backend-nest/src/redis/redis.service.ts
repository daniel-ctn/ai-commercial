/**
 * Redis Service — wraps ioredis for Upstash
 *
 * @Injectable() makes this class available for dependency injection.
 * Think of it like a singleton React context value — created once, shared everywhere.
 *
 * OnModuleDestroy lifecycle hook is like useEffect cleanup — runs when the module shuts down.
 *
 * Upstash Redis uses a standard Redis protocol, so ioredis works perfectly.
 * The connection URL format: rediss://default:TOKEN@HOST:PORT
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('UPSTASH_REDIS_URL');
    this.client = new Redis(url, {
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: 3,
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}
