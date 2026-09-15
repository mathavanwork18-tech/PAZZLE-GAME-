import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'engineering_day.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency (handles 40+ simultaneous players smoothly)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    username_normalized TEXT UNIQUE NOT NULL,
    animal_id TEXT NOT NULL,
    hat_id TEXT NOT NULL DEFAULT 'none',
    glasses_id TEXT NOT NULL DEFAULT 'none',
    outfit_id TEXT NOT NULL DEFAULT 'none',
    avatar_config TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    current_round INTEGER NOT NULL DEFAULT 1,
    puzzle_completed INTEGER NOT NULL DEFAULT 0,
    round_1_completed INTEGER NOT NULL DEFAULT 0,
    round_2_completed INTEGER NOT NULL DEFAULT 0,
    round_1_score INTEGER NOT NULL DEFAULT 0,
    round_2_score INTEGER NOT NULL DEFAULT 0,
    round_1_moves INTEGER NOT NULL DEFAULT 0,
    round_2_moves INTEGER NOT NULL DEFAULT 0,
    round_1_time_ms INTEGER NOT NULL DEFAULT 0,
    round_2_time_ms INTEGER NOT NULL DEFAULT 0,
    game_status TEXT NOT NULL DEFAULT 'WAITING',
    connection_status TEXT NOT NULL DEFAULT 'connected',
    session_token TEXT UNIQUE NOT NULL,
    shuffled_puzzle_r1 TEXT NOT NULL,
    shuffled_puzzle_r2 TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    completed_at INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_players_username_norm ON players(username_normalized);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
  CREATE INDEX IF NOT EXISTS idx_players_session_token ON players(session_token);

  CREATE TABLE IF NOT EXISTS match_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    match_id TEXT NOT NULL,
    event_title TEXT NOT NULL DEFAULT 'ENGINEERING DAY',
    event_subtitle TEXT NOT NULL DEFAULT 'PUZZLE CHALLENGE',
    match_code TEXT NOT NULL DEFAULT 'ENGDAY26',
    status TEXT NOT NULL DEFAULT 'WAITING',
    previous_status TEXT,
    current_round INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NOT NULL DEFAULT 40,
    round_1_duration_seconds INTEGER NOT NULL DEFAULT 180,
    round_2_duration_seconds INTEGER NOT NULL DEFAULT 600,
    match_duration_seconds INTEGER NOT NULL DEFAULT 600,
    match_start_time INTEGER,
    match_end_time INTEGER,
    round_1_start_at INTEGER,
    round_1_end_at INTEGER,
    round_2_start_at INTEGER,
    round_2_end_at INTEGER,
    is_paused INTEGER NOT NULL DEFAULT 0,
    paused_at INTEGER,
    total_paused_ms INTEGER NOT NULL DEFAULT 0,
    stop_reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );
`);

// Prepared statements for high performance
const insertPlayerStmt = db.prepare(`
  INSERT INTO players (
    player_id, username, username_normalized, animal_id, hat_id, glasses_id, outfit_id,
    avatar_config, score, coins, current_round, puzzle_completed, round_1_completed, round_2_completed,
    round_1_score, round_2_score, round_1_moves, round_2_moves, round_1_time_ms, round_2_time_ms,
    game_status, connection_status, session_token, shuffled_puzzle_r1, shuffled_puzzle_r2,
    joined_at, last_seen_at, created_at, updated_at
  ) VALUES (
    @player_id, @username, @username_normalized, @animal_id, @hat_id, @glasses_id, @outfit_id,
    @avatar_config, @score, @coins, @current_round, @puzzle_completed, @round_1_completed, @round_2_completed,
    @round_1_score, @round_2_score, @round_1_moves, @round_2_moves, @round_1_time_ms, @round_2_time_ms,
    @game_status, @connection_status, @session_token, @shuffled_puzzle_r1, @shuffled_puzzle_r2,
    @joined_at, @last_seen_at, @created_at, @updated_at
  )
`);

const getPlayerByTokenStmt = db.prepare(`SELECT * FROM players WHERE session_token = ?`);
const getPlayerByNormalizedNameStmt = db.prepare(`SELECT * FROM players WHERE username_normalized = ?`);
const countPlayersStmt = db.prepare(`SELECT COUNT(*) as count FROM players`);
const maxIdStmt = db.prepare(`SELECT COALESCE(MAX(id), 0) as max_id FROM players`);

const updateHeartbeatStmt = db.prepare(`
  UPDATE players 
  SET last_seen_at = ?, connection_status = 'connected', updated_at = ? 
  WHERE session_token = ?
`);

const updateAvatarStmt = db.prepare(`
  UPDATE players 
  SET animal_id = @animal_id, hat_id = @hat_id, glasses_id = @glasses_id, outfit_id = @outfit_id,
      avatar_config = @avatar_config, updated_at = @updated_at
  WHERE session_token = @session_token
`);

const updateStatusStmt = db.prepare(`
  UPDATE players
  SET game_status = ?, updated_at = ?
  WHERE session_token = ?
`);

const updateAllPlayersStatusStmt = db.prepare(`
  UPDATE players
  SET game_status = ?, updated_at = ?
  WHERE round_2_completed = 0
`);

const updateRound1CompletionStmt = db.prepare(`
  UPDATE players 
  SET round_1_completed = 1,
      round_1_score = @awarded_score,
      round_1_moves = @moves,
      round_1_time_ms = @solve_time_ms,
      score = score + @awarded_score,
      coins = coins + @coins_earned,
      current_round = 2,
      game_status = 'ROUND_1_COMPLETE',
      updated_at = @updated_at
  WHERE session_token = @session_token AND round_1_completed = 0
`);

const updateRound2CompletionStmt = db.prepare(`
  UPDATE players 
  SET round_2_completed = 1,
      puzzle_completed = 1,
      round_2_score = @awarded_score,
      round_2_moves = @moves,
      round_2_time_ms = @solve_time_ms,
      score = score + @awarded_score,
      coins = coins + @coins_earned,
      game_status = 'COMPLETED',
      completed_at = @now,
      updated_at = @updated_at
  WHERE session_token = @session_token AND round_2_completed = 0
`);

const advanceRound2Stmt = db.prepare(`
  UPDATE players
  SET current_round = 2, game_status = 'PLAYING', updated_at = ?
  WHERE session_token = ?
`);

const resetAllPlayersStmt = db.prepare(`
  UPDATE players
  SET score = 0, coins = 0, current_round = 1, puzzle_completed = 0,
      round_1_completed = 0, round_2_completed = 0, round_1_score = 0, round_2_score = 0,
      round_1_moves = 0, round_2_moves = 0, round_1_time_ms = 0, round_2_time_ms = 0,
      game_status = 'WAITING', completed_at = NULL, updated_at = ?
`);

const deletePlayerStmt = db.prepare(`DELETE FROM players WHERE player_id = ? OR id = ?`);

// Helper to format player object from DB row
function formatPlayerRow(row) {
  if (!row) return null;
  return {
    id: row.player_id,
    db_id: row.id,
    player_id: row.player_id,
    name: row.username,
    username: row.username,
    username_normalized: row.username_normalized,
    animal_id: row.animal_id,
    hat_id: row.hat_id || 'none',
    glasses_id: row.glasses_id || 'none',
    outfit_id: row.outfit_id || 'none',
    avatar_config: JSON.parse(row.avatar_config || '{}'),
    total_score: row.score,
    score: row.score,
    coins: row.coins,
    current_round: row.current_round,
    status: row.game_status,
    game_status: row.game_status,
    connection_status: row.connection_status,
    session_token: row.session_token,
    completed_round_1: Boolean(row.round_1_completed),
    completed_round_2: Boolean(row.round_2_completed),
    round_1_score: row.round_1_score,
    round_2_score: row.round_2_score,
    round_1_moves: row.round_1_moves,
    round_2_moves: row.round_2_moves,
    round_1_time_ms: row.round_1_time_ms,
    round_2_time_ms: row.round_2_time_ms,
    shuffled_puzzle_r1: JSON.parse(row.shuffled_puzzle_r1 || '[]'),
    shuffled_puzzle_r2: JSON.parse(row.shuffled_puzzle_r2 || '[]'),
    joined_at: row.joined_at,
    last_seen_at: row.last_seen_at,
    completed_at: row.completed_at
  };
}

// Generate sequential Player ID (e.g. ENG-0001)
export function generateNextPlayerId() {
  const { max_id } = maxIdStmt.get();
  const nextNumber = Number(max_id) + 1;
  return `ENG-${String(nextNumber).padStart(4, '0')}`;
}

export function isUsernameAvailable(name) {
  if (!name || typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  if (normalized.length < 2 || normalized.length > 24) return false;
  const existing = getPlayerByNormalizedNameStmt.get(normalized);
  return !existing;
}

export function createPlayerRecord({
  username,
  animal_id,
  hat_id = 'none',
  glasses_id = 'none',
  outfit_id = 'none',
  session_token,
  shuffled_puzzle_r1,
  shuffled_puzzle_r2,
  game_status = 'WAITING'
}) {
  const cleanName = username.trim();
  const normalized = cleanName.toLowerCase();

  // Atomically check uniqueness and generate next ID inside an immediate transaction
  const tx = db.transaction(() => {
    const existing = getPlayerByNormalizedNameStmt.get(normalized);
    if (existing) {
      const err = new Error('Username is already here. Try a new name.');
      err.code = 'USERNAME_TAKEN';
      throw err;
    }

    const { max_id } = maxIdStmt.get();
    const nextNumber = Number(max_id) + 1;
    const player_id = `ENG-${String(nextNumber).padStart(4, '0')}`;

    const now = Date.now();
    const isoDate = new Date().toISOString();

    const avatarConfig = JSON.stringify({
      animal: animal_id,
      hat: hat_id,
      glasses: glasses_id,
      outfit: outfit_id
    });

    insertPlayerStmt.run({
      player_id,
      username: cleanName,
      username_normalized: normalized,
      animal_id,
      hat_id,
      glasses_id,
      outfit_id,
      avatar_config: avatarConfig,
      score: 0,
      coins: 0,
      current_round: 1,
      puzzle_completed: 0,
      round_1_completed: 0,
      round_2_completed: 0,
      round_1_score: 0,
      round_2_score: 0,
      round_1_moves: 0,
      round_2_moves: 0,
      round_1_time_ms: 0,
      round_2_time_ms: 0,
      game_status,
      connection_status: 'connected',
      session_token,
      shuffled_puzzle_r1: JSON.stringify(shuffled_puzzle_r1),
      shuffled_puzzle_r2: JSON.stringify(shuffled_puzzle_r2),
      joined_at: now,
      last_seen_at: now,
      created_at: isoDate,
      updated_at: isoDate
    });

    const row = getPlayerByTokenStmt.get(session_token);
    return formatPlayerRow(row);
  });

  return tx();
}

export function getPlayerByToken(sessionToken) {
  if (!sessionToken) return null;
  const row = getPlayerByTokenStmt.get(sessionToken);
  return formatPlayerRow(row);
}

export function updatePlayerAvatar(sessionToken, { animal_id, hat_id, glasses_id, outfit_id }) {
  const row = getPlayerByTokenStmt.get(sessionToken);
  if (!row) return null;

  const finalAnimal = animal_id || row.animal_id;
  const finalHat = hat_id !== undefined ? hat_id : row.hat_id;
  const finalGlasses = glasses_id !== undefined ? glasses_id : row.glasses_id;
  const finalOutfit = outfit_id !== undefined ? outfit_id : row.outfit_id;

  const avatarConfig = JSON.stringify({
    animal: finalAnimal,
    hat: finalHat,
    glasses: finalGlasses,
    outfit: finalOutfit
  });

  updateAvatarStmt.run({
    animal_id: finalAnimal,
    hat_id: finalHat,
    glasses_id: finalGlasses,
    outfit_id: finalOutfit,
    avatar_config: avatarConfig,
    updated_at: new Date().toISOString(),
    session_token: sessionToken
  });

  return getPlayerByToken(sessionToken);
}

export function recordHeartbeat(sessionToken) {
  if (!sessionToken) return;
  updateHeartbeatStmt.run(Date.now(), new Date().toISOString(), sessionToken);
}

export function updatePlayerStatus(sessionToken, status) {
  updateStatusStmt.run(status, new Date().toISOString(), sessionToken);
}

export function updateAllActivePlayersStatus(status) {
  updateAllPlayersStatusStmt.run(status, new Date().toISOString());
}

export function advancePlayerToRound2(sessionToken) {
  advanceRound2Stmt.run(new Date().toISOString(), sessionToken);
  return getPlayerByToken(sessionToken);
}

export function completeRound({ sessionToken, roundNumber, awardedScore, coinsEarned, moves, solveTimeMs }) {
  const now = Date.now();
  const isoDate = new Date().toISOString();

  if (roundNumber === 1) {
    const res = updateRound1CompletionStmt.run({
      awarded_score: awardedScore,
      coins_earned: coinsEarned,
      moves,
      solve_time_ms: solveTimeMs,
      updated_at: isoDate,
      session_token: sessionToken
    });
    const updated = res.changes > 0;
    return { updated, player: getPlayerByToken(sessionToken) };
  } else {
    const res = updateRound2CompletionStmt.run({
      awarded_score: awardedScore,
      coins_earned: coinsEarned,
      moves,
      solve_time_ms: solveTimeMs,
      now,
      updated_at: isoDate,
      session_token: sessionToken
    });
    const updated = res.changes > 0;
    return { updated, player: getPlayerByToken(sessionToken) };
  }
}

export function getAllPlayers() {
  const rows = db.prepare(`SELECT * FROM players ORDER BY score DESC, round_2_completed DESC, round_1_completed DESC, joined_at ASC`).all();
  return rows.map(formatPlayerRow);
}

export function getPlayerCount() {
  const { count } = countPlayersStmt.get();
  return Number(count);
}

export function resetAllPlayers() {
  resetAllPlayersStmt.run(new Date().toISOString());
}

export function removePlayer(playerId) {
  deletePlayerStmt.run(playerId, playerId);
}

export function clearAllPlayers() {
  db.prepare('DELETE FROM players').run();
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'players'").run();
  } catch (e) {
    // ignore
  }
}

// MATCH STATE PERSISTENCE
export function saveMatchState(state) {
  const stmt = db.prepare(`
    INSERT INTO match_state (
      id, match_id, event_title, event_subtitle, match_code, status, previous_status,
      current_round, max_players, round_1_duration_seconds, round_2_duration_seconds,
      match_duration_seconds, match_start_time, match_end_time, round_1_start_at,
      round_1_end_at, round_2_start_at, round_2_end_at, is_paused, paused_at,
      total_paused_ms, stop_reason, version, updated_at
    ) VALUES (
      1, @match_id, @event_title, @event_subtitle, @match_code, @status, @previous_status,
      @current_round, @max_players, @round_1_duration_seconds, @round_2_duration_seconds,
      @match_duration_seconds, @match_start_time, @match_end_time, @round_1_start_at,
      @round_1_end_at, @round_2_start_at, @round_2_end_at, @is_paused, @paused_at,
      @total_paused_ms, @stop_reason, @version, @updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      previous_status = EXCLUDED.previous_status,
      current_round = EXCLUDED.current_round,
      match_start_time = EXCLUDED.match_start_time,
      match_end_time = EXCLUDED.match_end_time,
      round_1_start_at = EXCLUDED.round_1_start_at,
      round_1_end_at = EXCLUDED.round_1_end_at,
      round_2_start_at = EXCLUDED.round_2_start_at,
      round_2_end_at = EXCLUDED.round_2_end_at,
      is_paused = EXCLUDED.is_paused,
      paused_at = EXCLUDED.paused_at,
      total_paused_ms = EXCLUDED.total_paused_ms,
      stop_reason = EXCLUDED.stop_reason,
      version = EXCLUDED.version,
      updated_at = EXCLUDED.updated_at
  `);

  stmt.run({
    match_id: state.match_id || 'match-eng-2026-01',
    event_title: state.event_title || 'ENGINEERING DAY',
    event_subtitle: state.event_subtitle || 'PUZZLE CHALLENGE',
    match_code: state.match_code || 'ENGDAY26',
    status: state.status || 'WAITING',
    previous_status: state.previous_status || null,
    current_round: state.current_round || 1,
    max_players: state.max_players || 40,
    round_1_duration_seconds: state.round_1_duration_seconds || 180,
    round_2_duration_seconds: state.round_2_duration_seconds || 600,
    match_duration_seconds: state.match_duration_seconds || 600,
    match_start_time: state.match_start_time || null,
    match_end_time: state.match_end_time || null,
    round_1_start_at: state.round_1_start_at || null,
    round_1_end_at: state.round_1_end_at || null,
    round_2_start_at: state.round_2_start_at || null,
    round_2_end_at: state.round_2_end_at || null,
    is_paused: state.is_paused ? 1 : 0,
    paused_at: state.paused_at || null,
    total_paused_ms: state.total_paused_ms || 0,
    stop_reason: state.stop_reason || null,
    version: state.version || 1,
    updated_at: new Date().toISOString()
  });
}

export function loadMatchState() {
  const row = db.prepare(`SELECT * FROM match_state WHERE id = 1`).get();
  if (!row) return null;
  return {
    match_id: row.match_id,
    event_title: row.event_title,
    event_subtitle: row.event_subtitle,
    match_code: row.match_code,
    status: row.status,
    previous_status: row.previous_status,
    current_round: row.current_round,
    max_players: row.max_players,
    round_1_duration_seconds: row.round_1_duration_seconds,
    round_2_duration_seconds: row.round_2_duration_seconds,
    match_duration_seconds: row.match_duration_seconds,
    match_start_time: row.match_start_time,
    match_end_time: row.match_end_time,
    round_1_start_at: row.round_1_start_at,
    round_1_end_at: row.round_1_end_at,
    round_2_start_at: row.round_2_start_at,
    round_2_end_at: row.round_2_end_at,
    is_paused: Boolean(row.is_paused),
    paused_at: row.paused_at,
    total_paused_ms: row.total_paused_ms,
    stop_reason: row.stop_reason,
    version: row.version
  };
}

export default db;
