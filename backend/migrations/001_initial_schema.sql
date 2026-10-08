-- CampusFind Database Schema (Supabase / PostgreSQL)
-- Migration: 001_initial_schema.sql
-- Managed by Member 1 (Database) & Member 3 (Backend API)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_category AS ENUM ('electronics', 'id_cards', 'keys', 'wallets', 'clothing', 'books', 'accessories', 'other');
CREATE TYPE item_status AS ENUM ('reported', 'potential_match', 'verification_pending', 'confirmed_match', 'returned', 'closed');
CREATE TYPE match_status AS ENUM ('pending', 'verified', 'dismissed');
CREATE TYPE claim_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE notification_type AS ENUM ('match_found', 'claim_submitted', 'claim_reviewed', 'item_returned', 'system');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role DEFAULT 'student' NOT NULL,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Items Table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type item_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category item_category NOT NULL,
    color TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    location VARCHAR(255) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    image_url TEXT,
    storage_location VARCHAR(255),
    contact_info TEXT, -- sensitive: masked for unprivileged users
    status item_status DEFAULT 'reported' NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reporter_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Matches Table (AI similarity generated)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    found_item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    similarity_score NUMERIC(5,2) NOT NULL, -- 0.00 to 100.00
    confidence VARCHAR(20) NOT NULL,
    matched_attributes TEXT[] DEFAULT '{}',
    reasons TEXT[] DEFAULT '{}',
    status match_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_item_match UNIQUE(lost_item_id, found_item_id)
);

-- Claims / Verification Table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    claimant_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status claim_status DEFAULT 'submitted' NOT NULL,
    verification_details JSONB NOT NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit Logs Table (Admin & Security monitoring)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(type, status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_lost_item ON matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item ON matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, read);
