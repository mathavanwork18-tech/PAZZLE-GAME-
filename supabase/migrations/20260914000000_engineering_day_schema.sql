-- ==========================================================
-- ENGINEERING DAY — PUZZLE CHALLENGE: PRODUCTION SQL SCHEMA
-- Multi-player image puzzle game with server-authoritative state
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(120) NOT NULL DEFAULT 'Engineering Day 2026',
    subtitle VARCHAR(200) NOT NULL DEFAULT 'Think. Arrange. Solve.',
    event_code VARCHAR(30) UNIQUE NOT NULL DEFAULT 'ENGDAY26',
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_players_default INT NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PUZZLES TABLE
CREATE TABLE IF NOT EXISTS puzzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(120) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    difficulty VARCHAR(30) NOT NULL DEFAULT 'EASY', -- 'EASY' (3x3), 'HARD' (4x4)
    grid_size INT NOT NULL DEFAULT 3, -- 3 for 3x3, 4 for 4x4
    piece_count INT NOT NULL DEFAULT 9,
    solution_order INT[] NOT NULL, -- canonical [0, 1, 2, ..., n-1]
    shuffled_order INT[] NOT NULL,
    source_type VARCHAR(30) NOT NULL DEFAULT 'LOCAL_ASSET', -- 'AI_GENERATED', 'ADMIN_UPLOAD', 'LOCAL_ASSET'
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_prompt TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    created_by VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MATCHES TABLE (Authoritative State Machine)
-- States: WAITING -> ROUND_1_ACTIVE -> ROUND_1_FINISHED -> ROUND_2_ACTIVE -> ROUND_2_FINISHED -> COMPLETED / GAME_OVER / CANCELLED
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    match_code VARCHAR(30) NOT NULL DEFAULT 'ENGDAY26',
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    current_round INT NOT NULL DEFAULT 1,
    max_players INT NOT NULL DEFAULT 40,
    
    -- Round 1 configuration
    round_1_puzzle_id UUID REFERENCES puzzles(id),
    round_1_duration_seconds INT NOT NULL DEFAULT 180,
    round_1_start_at TIMESTAMPTZ,
    round_1_end_at TIMESTAMPTZ,
    
    -- Round 2 configuration (Hard puzzle: exactly 10 minutes default)
    round_2_puzzle_id UUID REFERENCES puzzles(id),
    round_2_duration_seconds INT NOT NULL DEFAULT 600,
    round_2_start_at TIMESTAMPTZ,
    round_2_end_at TIMESTAMPTZ,
    
    -- Pause handling
    is_paused BOOLEAN NOT NULL DEFAULT false,
    paused_at TIMESTAMPTZ,
    total_pause_duration_ms BIGINT NOT NULL DEFAULT 0,
    
    -- Concurrency control version
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AVATARS TABLE (The 16 cartoon animals)
CREATE TABLE IF NOT EXISTS avatars (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    accent_color VARCHAR(20) NOT NULL DEFAULT '#0EA5E9',
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0
);

-- 5. PLAYERS TABLE
-- Player statuses: JOINED, READY, PLAYING, COMPLETED_ROUND_1, PLAYING_ROUND_2, COMPLETED, TIME_UP, DISCONNECTED, REMOVED
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    animal_id VARCHAR(50) NOT NULL REFERENCES avatars(id),
    accessory_id VARCHAR(50) DEFAULT 'none',
    status VARCHAR(30) NOT NULL DEFAULT 'JOINED',
    connection_status VARCHAR(20) NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected'
    session_token_hash VARCHAR(128) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_player_name_len CHECK (char_length(trim(name)) >= 2 AND char_length(trim(name)) <= 24)
);

-- 6. PLAYER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS player_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(128) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 7. PLAYER ROUNDS TABLE (Per-round tracking & anti-duplicate)
CREATE TABLE IF NOT EXISTS player_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    puzzle_id UUID NOT NULL REFERENCES puzzles(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PLAYING', -- 'PLAYING', 'COMPLETED', 'TIME_UP', 'ABANDONED'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completion_time_ms BIGINT DEFAULT 0,
    move_count INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    submission_request_id UUID UNIQUE,
    current_board_state INT[],
    board_version INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_player_match_round UNIQUE (player_id, match_id, round_number)
);

-- 8. PUZZLE ATTEMPTS AUDIT LOG
CREATE TABLE IF NOT EXISTS puzzle_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    puzzle_id UUID NOT NULL REFERENCES puzzles(id),
    move_count INT NOT NULL,
    submitted_order INT[] NOT NULL,
    is_valid BOOLEAN NOT NULL,
    score_awarded INT NOT NULL DEFAULT 0,
    request_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SCORES TABLE (Deterministic Final Results)
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    round_1_score INT NOT NULL DEFAULT 0,
    round_2_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    total_moves INT NOT NULL DEFAULT 0,
    total_time_ms BIGINT NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    final_rank INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_score_match_player UNIQUE (match_id, player_id)
);

-- 10. ADMIN SESSIONS TABLE
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token_hash VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 11. SYSTEM AUDIT LOGS
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID,
    event_type VARCHAR(50) NOT NULL,
    match_id UUID,
    player_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- INDEXES FOR HIGH-CONCURRENCY (~40 PLAYERS REALTIME)
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_players_match_status ON players(match_id, status);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_player_rounds_match_player ON player_rounds(match_id, player_id, round_number);
CREATE INDEX IF NOT EXISTS idx_scores_match_total ON scores(match_id, total_score DESC, total_time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_puzzles_status ON puzzles(status);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Public can view active event, published avatars, active match status
CREATE POLICY "Public read active events" ON events FOR SELECT USING (is_active = true);
CREATE POLICY "Public read published avatars" ON avatars FOR SELECT USING (active = true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read players in match" ON players FOR SELECT USING (true);
CREATE POLICY "Public read puzzles metadata" ON puzzles FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "Public read scores" ON scores FOR SELECT USING (true);

-- ==========================================================
-- SEED DATA: THE 16 CARTOON ANIMAL AVATARS
-- ==========================================================
INSERT INTO avatars (id, name, image_url, accent_color, display_order) VALUES
('fox', 'Fox', '/avatars/fox.png', '#F97316', 1),
('panda', 'Panda', '/avatars/panda.png', '#10B981', 2),
('tiger', 'Tiger', '/avatars/tiger.png', '#EAB308', 3),
('lion', 'Lion', '/avatars/lion.png', '#EF4444', 4),
('koala', 'Koala', '/avatars/koala.png', '#A855F7', 5),
('penguin', 'Penguin', '/avatars/penguin.png', '#38BDF8', 6),
('rabbit', 'Rabbit', '/avatars/rabbit.png', '#EC4899', 7),
('bear', 'Bear', '/avatars/bear.png', '#3B82F6', 8),
('monkey', 'Monkey', '/avatars/monkey.png', '#84CC16', 9),
('frog', 'Frog', '/avatars/frog.png', '#14B8A6', 10),
('raccoon', 'Raccoon', '/avatars/raccoon.png', '#8B5CF6', 11),
('elephant', 'Elephant', '/avatars/elephant.png', '#60A5FA', 12),
('giraffe', 'Giraffe', '/avatars/giraffe.png', '#06B6D4', 13),
('zebra', 'Zebra', '/avatars/zebra.png', '#9333EA', 14),
('cat', 'Cat', '/avatars/cat.png', '#F43F5E', 15),
('dog', 'Dog', '/avatars/dog.png', '#2563EB', 16)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    image_url = EXCLUDED.image_url,
    accent_color = EXCLUDED.accent_color,
    display_order = EXCLUDED.display_order;

-- ==========================================================
-- SEED DATA: ROUND 1 & ROUND 2 DEFAULT PUZZLES
-- ==========================================================
INSERT INTO puzzles (id, title, description, image_url, difficulty, grid_size, piece_count, solution_order, shuffled_order, source_type, status)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Robotics & Circuit Lab',
    'Autonomous circuit assembler robot in engineering workshop (3x3 Simple Puzzle)',
    '/puzzles/round1_robotics.webp',
    'EASY',
    3,
    9,
    ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8],
    ARRAY[4, 0, 8, 2, 7, 1, 6, 3, 5],
    'LOCAL_ASSET',
    'PUBLISHED'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Quantum Supercomputer Core',
    'High-tech aerospace quantum fusion array & cleanroom lab (4x4 Hard Puzzle)',
    '/puzzles/round2_quantum.webp',
    'HARD',
    4,
    16,
    ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    ARRAY[10, 2, 15, 7, 1, 14, 4, 11, 8, 0, 13, 5, 9, 3, 12, 6],
    'LOCAL_ASSET',
    'PUBLISHED'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Event & Active Match
INSERT INTO events (id, title, subtitle, event_code, is_active, max_players_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'Engineering Day 2026', 'Think. Arrange. Solve.', 'ENGDAY26', true, 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (
    id,
    event_id,
    match_code,
    status,
    current_round,
    max_players,
    round_1_puzzle_id,
    round_1_duration_seconds,
    round_2_puzzle_id,
    round_2_duration_seconds,
    version
)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'ENGDAY26',
    'WAITING',
    1,
    40,
    '11111111-1111-1111-1111-111111111111',
    180,
    '22222222-2222-2222-2222-222222222222',
    600,
    1
)
ON CONFLICT (id) DO NOTHING;
