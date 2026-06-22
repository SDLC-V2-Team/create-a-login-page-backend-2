import { findUserByUsername, createUser, User } from './user';
import { query } from '../config/db';

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

describe('findUserByUsername', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a user when found by username', async () => {
    mockedQuery.mockResolvedValueOnce([mockUser]);

    const result = await findUserByUsername('testuser');

    expect(mockedQuery).toHaveBeenCalledWith(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1 LIMIT 1',
      ['testuser']
    );
    expect(result).toEqual(mockUser);
  });

  it('should return null when no user is found', async () => {
    mockedQuery.mockResolvedValueOnce([]);

    const result = await findUserByUsername('nonexistent');

    expect(mockedQuery).toHaveBeenCalledWith(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1 LIMIT 1',
      ['nonexistent']
    );
    expect(result).toBeNull();
  });

  it('should throw an error when the database query fails', async () => {
    const dbError = new Error('Database connection error');
    mockedQuery.mockRejectedValueOnce(dbError);

    await expect(findUserByUsername('testuser')).rejects.toThrow('Database connection error');
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
});

describe('createUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create and return a new user with email', async () => {
    mockedQuery.mockResolvedValueOnce([mockUser]);

    const result = await createUser('testuser', 'hashed_password_123', 'test@example.com');

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['testuser', 'test@example.com', 'hashed_password_123']
    );
    expect(result).toEqual(mockUser);
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
  });

  it('should create a user with null email', async () => {
    const userWithNullEmail: User = { ...mockUser, email: null };
    mockedQuery.mockResolvedValueOnce([userWithNullEmail]);

    const result = await createUser('testuser', 'hashed_password_123', null);

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['testuser', null, 'hashed_password_123']
    );
    expect(result).toEqual(userWithNullEmail);
    expect(result.email).toBeNull();
  });

  it('should throw an error when the database insert fails', async () => {
    const dbError = new Error('Unique constraint violation');
    mockedQuery.mockRejectedValueOnce(dbError);

    await expect(createUser('testuser', 'hashed_password_123', 'test@example.com')).rejects.toThrow(
      'Unique constraint violation'
    );
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
});