import { pool, query } from './db';

// Mock the 'pg' module
jest.mock('pg', () => {
  const mPoolQuery = jest.fn();
  const mPoolOn = jest.fn();
  const mPool = jest.fn(() => ({
    query: mPoolQuery,
    on: mPoolOn,
  }));
  return { Pool: mPool };
});

// Mock the env config
jest.mock('./env', () => ({
  env: {
    databaseUrl: 'postgresql://test:test@localhost:5432/testdb',
  },
}));

describe('db module', () => {
  let poolQueryMock: jest.Mock;

  beforeEach(() => {
    // Retrieve the mocked pool.query from the pool instance
    poolQueryMock = pool.query as jest.Mock;
    poolQueryMock.mockReset();
  });

  describe('query()', () => {
    it('happy path: returns rows when query succeeds with params', async () => {
      const fakeRows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      poolQueryMock.mockResolvedValueOnce({ rows: fakeRows });

      const result = await query<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );

      expect(poolQueryMock).toHaveBeenCalledTimes(1);
      expect(poolQueryMock).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(fakeRows);
    });

    it('happy path: returns rows when query is called without params', async () => {
      const fakeRows = [{ id: 1, email: 'test@example.com' }];
      poolQueryMock.mockResolvedValueOnce({ rows: fakeRows });

      const result = await query<{ id: number; email: string }>('SELECT * FROM users');

      expect(poolQueryMock).toHaveBeenCalledTimes(1);
      expect(poolQueryMock).toHaveBeenCalledWith('SELECT * FROM users', undefined);
      expect(result).toEqual(fakeRows);
    });

    it('edge case: returns empty array when query yields no rows', async () => {
      poolQueryMock.mockResolvedValueOnce({ rows: [] });

      const result = await query('SELECT * FROM users WHERE id = $1', [999]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('error path: throws when pool.query rejects', async () => {
      const dbError = new Error('connection refused');
      poolQueryMock.mockRejectedValueOnce(dbError);

      await expect(query('SELECT 1')).rejects.toThrow('connection refused');
      expect(poolQueryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('pool error event', () => {
    it('edge case: pool.on registers an error handler on initialization', () => {
      // Verify that pool.on was called with 'error' during module initialization
      const poolOnMock = pool.on as jest.Mock;
      expect(poolOnMock).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});