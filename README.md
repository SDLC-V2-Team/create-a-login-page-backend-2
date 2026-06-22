# Login Page Service

A production-ready starter implementing the **"create a login page"** requirement, built strictly against the agreed ADR:

| ADR | Decision | Implementation |
|-----|----------|----------------|
| ADR-001 | JWT with **HS256** | `src/utils/jwt.ts` (jsonwebtoken, `algorithm: HS256`) |
| ADR-002 | **bcrypt** password hashing (cost 12) | `src/utils/password.ts` |
| ADR-003 | **PostgreSQL** persistence | `src/config/db.ts`, `src/db/schema.sql` |

## Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript
- **Framework:** Express
- **Database:** PostgreSQL (via `pg` with connection pooling)
- **Frontend:** Static HTML/CSS/JS login page served from `public/`

## Project Structure

```
.
├── public/              # Static login page (HTML/CSS/JS)
├── src/
│   ├── config/          # env + database pool
│   ├── controllers/     # auth controllers
│   ├── db/              # schema + migration runner
│   ├── middleware/      # JWT auth guard
│   ├── models/          # user data access
│   ├── routes/          # express routers
│   ├── utils/           # jwt + bcrypt helpers
│   └── index.ts         # entry point
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# edit JWT_SECRET and DATABASE_URL as needed
```

### 3. Start PostgreSQL & run migration
```bash
# Using docker-compose for the DB only:
docker compose up -d db
npm run migrate
```

### 4. Run the service
```bash
npm run dev      # development with hot reload
# or
npm run build && npm start
```

Open http://localhost:3000 to view the login page.

### Run the full stack with Docker
```bash
docker compose up --build
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create a user (`{ username, password, email? }`) |
| POST | `/api/auth/login` | Authenticate, returns JWT + sets httpOnly cookie |
| POST | `/api/auth/logout` | Clears the auth cookie |
| GET  | `/api/auth/me` | Returns current user (requires Bearer token / cookie) |
| GET  | `/health` | Health check |

### Example
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"s3cret!"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"s3cret!"}'
```

## Security Notes

- Passwords are hashed with bcrypt (cost 12) — never stored in plaintext.
- JWTs are signed with HS256; set a strong `JWT_SECRET` in production.
- Login returns a generic error to prevent username enumeration.
- Token revocation (ADR-001 negative consequence) would require a blacklist — out of MVP scope.
