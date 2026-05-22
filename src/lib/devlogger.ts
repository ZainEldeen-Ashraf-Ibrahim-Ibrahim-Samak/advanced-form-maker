type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class DevLogger {
  private level: LogLevel;

  constructor() {
    this.level = (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as LogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
  }

  debug(message: string, meta?: any) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: any, meta?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta), error || '');
    }
  }
}

export const devlogger = new DevLogger();
