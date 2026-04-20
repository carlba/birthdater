import { fileURLToPath } from 'url';

import logger from './logger.js';
import { config } from './config.js';

export function helloWorld() {
  return `Hello World! NODE_ENV is ${config.NODE_ENV}`;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  logger.info(helloWorld());
}
