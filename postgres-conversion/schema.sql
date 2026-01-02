-- Slovak Patriot Tournament Platform - PostgreSQL Schema
-- Run this on your Render PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    team_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    wallet INTEGER DEFAULT 0,
    transactions JSONB DEFAULT '[]',
    registered_events JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    elimination_type VARCHAR(50) DEFAULT 'single',
    icon_url TEXT,
    stream_url TEXT,
    lobby_url TEXT,
    team_size INTEGER,
    entry_fee INTEGER DEFAULT 0,
    prize_pool JSONB DEFAULT '{}',
    prizes JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'upcoming',
    registrations JSONB DEFAULT '[]',
    matches JSONB DEFAULT '[]',
    bracket JSONB,
    loser_bracket JSONB,
    winner JSONB,
    disqualified JSONB DEFAULT '[]',
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    motto TEXT,
    captain_id VARCHAR(255) NOT NULL,
    members JSONB DEFAULT '[]',
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    responses JSONB DEFAULT '[]',
    messages JSONB DEFAULT '[]',
    has_unread_response BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    room VARCHAR(255) DEFAULT 'global',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament chat table
CREATE TABLE IF NOT EXISTS tournament_chat (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_captain BOOLEAN DEFAULT FALSE,
    team_id VARCHAR(255),
    room VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reset tokens table
CREATE TABLE IF NOT EXISTS reset_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_tournament_chat_room ON tournament_chat(room);
CREATE INDEX IF NOT EXISTS idx_tournament_chat_timestamp ON tournament_chat(timestamp);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Add foreign key constraints (optional, for data integrity)
-- ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
-- ALTER TABLE teams ADD CONSTRAINT fk_teams_captain FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE tickets ADD CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;