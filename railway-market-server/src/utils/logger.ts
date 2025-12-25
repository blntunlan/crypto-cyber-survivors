export class Logger {
  private static formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  static info(message: string, data?: unknown): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  static warn(message: string, data?: unknown): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  static error(message: string, error?: unknown): void {
    console.error(
      this.formatMessage('ERROR', message, error instanceof Error ? error.message : error)
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  static debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
}
