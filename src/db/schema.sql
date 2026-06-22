-- ADR-003: User credential persistence schema
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(255) NOT NULL UNIQUE,
    email         VARCHAR(320) UNIQUE,
    password_hash VARCHAR(72)  NOT NULL, -- bcrypt hash (~60 bytes)
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
