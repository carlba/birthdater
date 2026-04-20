import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('helloWorld', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('should return "Hello World!"', async () => {
    process.env.NODE_ENV = 'test';
    const { helloWorld } = await import('./index.js');
    expect(helloWorld()).toBe('Hello World! NODE_ENV is test');
  });
});
