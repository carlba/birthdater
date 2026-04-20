import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('config schema', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('allows production, development, and test values', async () => {
    process.env.NODE_ENV = 'production';
    const { config: productionConfig } = await import('./config.js');
    expect(productionConfig.NODE_ENV).toBe('production');

    vi.resetModules();
    process.env.NODE_ENV = 'development';
    const { config: developmentConfig } = await import('./config.js');
    expect(developmentConfig.NODE_ENV).toBe('development');

    vi.resetModules();
    process.env.NODE_ENV = 'test';
    const { config: testConfig } = await import('./config.js');
    expect(testConfig.NODE_ENV).toBe('test');
  });

  it('defaults NODE_ENV to development when missing', async () => {
    delete process.env.NODE_ENV;
    const { config } = await import('./config.js');
    expect(config.NODE_ENV).toBe('development');
  });

  it('disallows all other values', async () => {
    process.env.NODE_ENV = 'dummy';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(import('./config.js')).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
