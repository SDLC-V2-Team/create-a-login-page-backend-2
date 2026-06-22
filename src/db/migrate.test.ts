import fs from 'fs';
import path from 'path';

// Mock dependencies before importing anything that uses them
jest.mock('fs');
jest.mock('../config/db', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(),
  },
}));

import { pool } from '../config/db';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPool = pool as jest.Mocked<typeof pool>;

// Helper to re-run the migrate module fresh
async function runMigrateModule(): Promise<void> {
  jest.isolateModules(() => {
    require('./migrate');
  });
  // Allow promises to flush
  await new Promise((resolve) => setImmediate(resolve));
}

describe('migrate', () => {
  const fakeSql = 'CREATE TABLE users (id SERIAL PRIMARY KEY);';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: readFileSync returns valid SQL
    mockedFs.readFileSync = jest.fn().mockReturnValue(fakeSql);
    (mockedPool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (mockedPool.end as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('happy path: reads schema.sql, executes query, and ends pool', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runMigrateModule();

    // Give micro-tasks a chance to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedFs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('schema.sql'),
      'utf-8'
    );
    expect(mockedPool.query).toHaveBeenCalledWith(fakeSql);
    expect(mockedPool.end).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Migration applied successfully.');

    consoleSpy.mockRestore();
  });

  it('happy path: schema path is resolved relative to __dirname', async () => {
    await runMigrateModule();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const calledPath: string = (mockedFs.readFileSync as jest.Mock).mock.calls[0][0];
    expect(calledPath).toMatch(/schema\.sql$/);
    expect(path.isAbsolute(calledPath)).toBe(true);
  });

  it('edge case: pool.end is always called after a successful query', async () => {
    (mockedPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

    await runMigrateModule();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPool.end).toHaveBeenCalledTimes(1);
  });

  it('edge case: handles empty SQL file without throwing', async () => {
    mockedFs.readFileSync = jest.fn().mockReturnValue('');
    (mockedPool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runMigrateModule();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockedPool.query).toHaveBeenCalledWith('');
    expect(mockedPool.end).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('error path: calls console.error and process.exit(1) when pool.query rejects', async () => {
    const dbError = new Error('DB connection refused');
    (mockedPool.query as jest.Mock).mockRejectedValue(dbError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      return undefined as never;
    });

    await runMigrateModule();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith('Migration failed:', dbError);
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});