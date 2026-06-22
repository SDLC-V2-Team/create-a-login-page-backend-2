import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Serve the static login page.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Authentication API.
app.use('/api/auth', authRoutes);

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Login page service listening on http://localhost:${env.port}`);
});

export { app, server };
