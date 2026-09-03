type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

function safeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !/password|secret|authorization/i.test(key)),
  );
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (import.meta.env.DEV) console.debug(`[MyProxy] ${message}`, safeContext(context));
  },
  info(message: string, context?: LogContext): void {
    console.info(`[MyProxy] ${message}`, safeContext(context));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(`[MyProxy] ${message}`, safeContext(context));
  },
  error(message: string, context?: LogContext): void {
    console.error(`[MyProxy] ${message}`, safeContext(context));
  },
};
