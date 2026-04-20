import { z } from 'zod';
import logger from './logger.js';

const envSchema = z
  .object({
    NODE_ENV: z
      .string()
      .trim()
      .default('development')
      .pipe(z.enum(['production', 'development', 'test'])),
  })
  .transform(raw => ({
    NODE_ENV: raw.NODE_ENV,
    isDevelopment: raw.NODE_ENV !== 'production',
  }));

export type Config = z.infer<typeof envSchema>;

export const parseConfig = (env = process.env) => envSchema.safeParse(env);

export const getConfig = (env = process.env): Config => {
  const result = parseConfig(env);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
};

const initConfig = (): Config => {
  const result = parseConfig();

  if (!result.success) {
    logger.error({ issues: result.error.issues }, 'Failed to read the config');
    process.exit(1);
  }

  logger.info({ config: result.data });
  return result.data;
};

export const config: Config = initConfig();
