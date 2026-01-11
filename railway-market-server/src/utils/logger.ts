/* eslint-disable no-console */
export class Logger {
  private static formatMessage(
    level: string,
    message: string,
    data?: unknown
  ): string | object {
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        data,
      });
    }
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  private static log(level: string, message: string, data?: unknown): void {
    const formatted = this.formatMessage(level, message, data);
    if (typeof formatted === 'string' && process.env.NODE_ENV === 'production') {
      console.log(formatted); // JSON string
    } else if (level === 'ERROR') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  static info(message: string, data?: unknown): void {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: unknown): void {
    this.log('WARN', message, data);
  }

  static error(message: string, error?: unknown): void {
    const errorData =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.log('ERROR', message, errorData);
  }

  static debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, data);
    }
  }
}
