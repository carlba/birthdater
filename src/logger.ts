import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = pino(
  isDevelopment
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }
    : { level: 'info' }
);

export default logger;
