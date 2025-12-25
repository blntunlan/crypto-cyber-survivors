import { Logger } from './logger';

interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoff?: boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.delayMs;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxRetries) {
        break;
      }

      Logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      if (options.backoff) {
        delay *= 2;
      }
    }
  }

  throw lastError;
}
