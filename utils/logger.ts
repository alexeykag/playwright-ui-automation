type Level = 'INFO' | 'WARN' | 'ERROR';

/** Prints a timestamped line: INFO to stdout, WARN and ERROR to stderr. */
function write(level: Level, message: string, context?: object): void {
  const suffix = context ? ` ${JSON.stringify(context)}` : '';
  const line = `${new Date().toISOString()} [${level}] ${message}${suffix}`;
  if (level === 'INFO') console.log(line);
  else console.error(line);
}

export const logger = {
  /** Logs at INFO level. */
  info: (message: string, context?: object): void => write('INFO', message, context),
  /** Logs at WARN level. */
  warn: (message: string, context?: object): void => write('WARN', message, context),
  /** Logs at ERROR level. */
  error: (message: string, context?: object): void => write('ERROR', message, context),
};
