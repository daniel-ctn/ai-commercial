import { Injectable } from '@nestjs/common';

interface LatencyBucket {
  count: number;
  totalMs: number;
  maxMs: number;
}

@Injectable()
export class MetricsService {
  private apiLatency: Map<string, LatencyBucket> = new Map();
  private chatLatency: Map<string, LatencyBucket> = new Map();
  private counters: Map<string, number> = new Map();
  private startedAt = Date.now();

  recordLatency(route: string, ms: number) {
    const key = route.replace(/\/[0-9a-f-]{36}/g, '/:id');
    const bucket = this.apiLatency.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    bucket.count++;
    bucket.totalMs += ms;
    if (ms > bucket.maxMs) bucket.maxMs = ms;
    this.apiLatency.set(key, bucket);
  }

  recordChatLatency(route: string, ms: number) {
    const key = route.replace(/\/[0-9a-f-]{36}/g, '/:id');
    const bucket = this.chatLatency.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    bucket.count++;
    bucket.totalMs += ms;
    if (ms > bucket.maxMs) bucket.maxMs = ms;
    this.chatLatency.set(key, bucket);
  }

  increment(counter: string) {
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + 1);
  }

  getSnapshot() {
    const latencyEntries: Record<string, { count: number; avgMs: number; maxMs: number }> = {};
    for (const [route, bucket] of this.apiLatency.entries()) {
      latencyEntries[route] = {
        count: bucket.count,
        avgMs: Math.round(bucket.totalMs / bucket.count),
        maxMs: Math.round(bucket.maxMs),
      };
    }
    const chatLatencyEntries: Record<string, { count: number; avgMs: number; maxMs: number }> =
      {};
    for (const [route, bucket] of this.chatLatency.entries()) {
      chatLatencyEntries[route] = {
        count: bucket.count,
        avgMs: Math.round(bucket.totalMs / bucket.count),
        maxMs: Math.round(bucket.maxMs),
      };
    }

    const counterEntries: Record<string, number> = {};
    for (const [key, val] of this.counters.entries()) {
      counterEntries[key] = val;
    }

    return {
      uptime_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      api_latency: latencyEntries,
      chat_latency: chatLatencyEntries,
      counters: counterEntries,
    };
  }

  reset() {
    this.apiLatency.clear();
    this.chatLatency.clear();
    this.counters.clear();
  }
}
