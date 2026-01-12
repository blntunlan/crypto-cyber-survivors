export interface InputLogEntry {
  t: number; // Time from start (ms)
  a: string; // Action
  d?: unknown; // Data
}

export class InputLogger {
  private static instance: InputLogger | null = null;
  private logs: InputLogEntry[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private readonly MAX_LOGS = 10000; // Cap to prevent memory issues

  private constructor() {}

  static getInstance(): InputLogger {
    return (InputLogger.instance ??= new InputLogger());
  }

  start(): void {
    this.logs = [];
    this.startTime = Date.now();
    this.isRecording = true;
  }

  stop(): InputLogEntry[] {
    this.isRecording = false;
    return [...this.logs];
  }

  log(action: string, data?: unknown): void {
    if (!this.isRecording) return;
    if (this.logs.length >= this.MAX_LOGS) return;

    this.logs.push({
      t: Date.now() - this.startTime,
      a: action,
      d: this.sanitize(data),
    });
  }

  private sanitize(data: unknown): unknown {
    if (!data) return undefined;
    // Simple deep copy to avoid reference issues
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }

  getLogs(): InputLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}
