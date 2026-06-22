import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET', 'change-me-to-a-long-random-secret-value'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  bcryptCost: parseInt(process.env.BCRYPT_COST ?? '12', 10),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/loginpage'),
};
