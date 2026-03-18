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
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('UPSTASH_REDIS_URL');
    const isProduction = this.config.get('NODE_ENV') === 'production';
    this.client = new Redis(url, {
      tls: { rejectUnauthorized: isProduction },
      maxRetriesPerRequest: 3,
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis read failed for key ${key}: ${err}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Redis write failed for key ${key}: ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis delete failed for key ${key}: ${err}`);
    }
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

  async setIfAbsent(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
