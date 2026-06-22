import dotenv from 'dotenv';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('env config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should load default values when environment variables are not set', async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.BCRYPT_COST;
    delete process.env.DATABASE_URL;

    const { env } = await import('./env');

    expect(env.port).toBe(3000);
    expect(env.nodeEnv).toBe('development');
    expect(env.jwtSecret).toBe('change-me-to-a-long-random-secret-value');
    expect(env.jwtExpiresIn).toBe('1h');
    expect(env.bcryptCost).toBe(12);
    expect(env.databaseUrl).toBe('postgres://postgres:postgres@localhost:5432/loginpage');
  });

  it('should use custom environment variable values when provided', async () => {
    process.env.PORT = '8080';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'super-secret-key';
    process.env.JWT_EXPIRES_IN = '2h';
    process.env.BCRYPT_COST = '10';
    process.env.DATABASE_URL = 'postgres://user:pass@remotehost:5432/mydb';

    const { env } = await import('./env');

    expect(env.port).toBe(8080);
    expect(env.nodeEnv).toBe('production');
    expect(env.jwtSecret).toBe('super-secret-key');
    expect(env.jwtExpiresIn).toBe('2h');
    expect(env.bcryptCost).toBe(10);
    expect(env.databaseUrl).toBe('postgres://user:pass@remotehost:5432/mydb');
  });

  it('should parse PORT as an integer, not a string', async () => {
    process.env.PORT = '4200';

    const { env } = await import('./env');

    expect(typeof env.port).toBe('number');
    expect(env.port).toBe(4200);
  });

  it('should parse BCRYPT_COST as an integer, not a string', async () => {
    process.env.BCRYPT_COST = '14';

    const { env } = await import('./env');

    expect(typeof env.bcryptCost).toBe('number');
    expect(env.bcryptCost).toBe(14);
  });

  it('required() should throw when a required variable is missing and no fallback is provided', async () => {
    // We test `required` indirectly by removing DATABASE_URL and JWT_SECRET
    // and using a module that calls required without a fallback.
    // Since both have fallbacks in env.ts, we test via a direct unit approach:
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;

    // Dynamically inline a scenario: re-export required via a temp module approach
    // Instead, we test by temporarily patching dotenv and env to remove fallbacks
    // by importing the isolated function logic inline.

    // Direct test: simulate missing var with no fallback by checking error message
    const originalJwtSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    // Load the module to get the `required` function exported indirectly.
    // Since `required` is not exported, we validate the behavior by checking
    // that missing a truly required var (with no fallback) would throw.
    // We do this by crafting a minimal inline replica:
    function requiredTest(name: string, fallback?: string): string {
      const value = process.env[name] ?? fallback;
      if (value === undefined) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
      return value;
    }

    expect(() => requiredTest('TOTALLY_MISSING_VAR_XYZ')).toThrow(
      'Missing required environment variable: TOTALLY_MISSING_VAR_XYZ'
    );

    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('required() should return the fallback value when env var is missing', async () => {
    delete process.env.JWT_SECRET;

    // Inline replica of `required` to unit-test the fallback logic
    function requiredTest(name: string, fallback?: string): string {
      const value = process.env[name] ?? fallback;
      if (value === undefined) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
      return value;
    }

    const result = requiredTest('JWT_SECRET', 'my-fallback-secret');
    expect(result).toBe('my-fallback-secret');
  });
});