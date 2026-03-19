import { Injectable } from '@nestjs/common';

export interface TrackedError {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  message: string;
  stack?: string;
  requestId?: string;
}

const MAX_ERRORS = 100;

@Injectable()
export class ErrorTrackerService {
  private readonly errors: TrackedError[] = [];

  capture(error: TrackedError) {
    this.errors.push(error);
    if (this.errors.length > MAX_ERRORS) {
      this.errors.shift();
    }
  }

  getRecent(limit = 20, includeSensitive = false) {
    return this.errors.slice(-limit).reverse().map((error) => {
      if (includeSensitive) {
        return { ...error };
      }

      return {
        timestamp: error.timestamp,
        method: error.method,
        url: error.url,
        status: error.status,
        requestId: error.requestId,
      };
    });
  }

  getCount(): number {
    return this.errors.length;
  }

  clear() {
    this.errors.length = 0;
  }
}
