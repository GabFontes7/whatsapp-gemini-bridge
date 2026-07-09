import config from '../config/env.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;

function log(level, event, data = {}) {
  if ((LEVELS[level] ?? 0) < currentLevel) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };

  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (event, data) => log('debug', event, data),
  info: (event, data) => log('info', event, data),
  warn: (event, data) => log('warn', event, data),
  error: (event, data) => log('error', event, data),
};
