import pino from 'pino';
import { env } from './env.js';

// Create Pino logger instance
export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});

// Type-safe logging helpers
export const log = {
  debug: (msg: string, obj?: object) => logger.debug(obj, msg),
  info: (msg: string, obj?: object) => logger.info(obj, msg),
  warn: (msg: string, obj?: object) => logger.warn(obj, msg),
  error: (msg: string, obj?: object | Error) => {
    if (obj instanceof Error) {
      logger.error({ err: obj }, msg);
    } else {
      logger.error(obj, msg);
    }
  },
  fatal: (msg: string, obj?: object | Error) => {
    if (obj instanceof Error) {
      logger.fatal({ err: obj }, msg);
    } else {
      logger.fatal(obj, msg);
    }
  },
};
