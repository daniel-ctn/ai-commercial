/**
 * Redis Module — Upstash Redis Connection
 *
 * In Next.js, you'd create a Redis client utility and import it where needed.
 * In NestJS, we wrap it in a Module so it can be dependency-injected.
 *
 * The pattern: create a Module that provides a service, then inject that
 * service into any class that needs it via constructor injection.
 *
 * `Global()` makes this available everywhere (like React Context at the root).
 */
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
