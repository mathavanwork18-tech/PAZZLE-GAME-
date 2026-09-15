import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as db from './db.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_CODE = process.env.ADMIN_INITIAL_CODE || 'admin@1977';
const EMERGENCY_REJOIN_CODE = process.env.EMERGENCY_REJOIN_CODE || '0000';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

let genAI = null;
if (GEMINI_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
}

// 16 Mascots
const avatarsList = [
  { id: 'lion', name: 'Lion', image_url: '/avatars/lion.png', accent_color: '#EF4444' },
  { id: 'tiger', name: 'Tiger', image_url: '/avatars/tiger.png', accent_color: '#F97316' },
  { id: 'panda', name: 'Panda', image_url: '/avatars/panda.png', accent_color: '#10B981' },
  { id: 'fox', name: 'Fox', image_url: '/avatars/fox.png', accent_color: '#EA580C' },
  { id: 'rabbit', name: 'Rabbit', image_url: '/avatars/rabbit.png', accent_color: '#EC4899' },
  { id: 'bear', name: 'Bear', image_url: '/avatars/bear.png', accent_color: '#3B82F6' },
  { id: 'cat', name: 'Cat', image_url: '/avatars/cat.png', accent_color: '#F43F5E' },
  { id: 'dog', name: 'Dog', image_url: '/avatars/dog.png', accent_color: '#2563EB' },
  { id: 'penguin', name: 'Penguin', image_url: '/avatars/penguin.png', accent_color: '#06B6D4' },
  { id: 'koala', name: 'Koala', image_url: '/avatars/koala.png', accent_color: '#8B5CF6' },
  { id: 'monkey', name: 'Monkey', image_url: '/avatars/monkey.png', accent_color: '#84CC16' },
  { id: 'elephant', name: 'Elephant', image_url: '/avatars/elephant.png', accent_color: '#64748B' },
  { id: 'frog', name: 'Frog', image_url: '/avatars/frog.png', accent_color: '#14B8A6' },
  { id: 'raccoon', name: 'Raccoon', image_url: '/avatars/raccoon.png', accent_color: '#8B5CF6' },
  { id: 'giraffe', name: 'Giraffe', image_url: '/avatars/giraffe.png', accent_color: '#06B6D4' },
  { id: 'zebra', name: 'Zebra', image_url: '/avatars/zebra.png', accent_color: '#9333EA' }
];

function generateShuffledArray(size = 25) {
  const arr = Array.from({ length: size }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  let matches = 0;
  for (let i = 0; i < size; i++) {
    if (arr[i] === i) matches++;
  }
  if (matches > 2) {
    [arr[0], arr[size - 1]] = [arr[size - 1], arr[0]];
    [arr[1], arr[size - 2]] = [arr[size - 2], arr[1]];
  }
  return arr;
}

const canonicalSolution25 = Array.from({ length: 25 }, (_, i) => i);

const initialPuzzles = {
  round1: {
    id: 'puz-r1-robotics',
    title: 'Student Robotics & Automation Workshop',
    description: 'Autonomous robotics rover assembly and electronics workshop',
    image_url: '/puzzles/round1_robotics.webp',
    difficulty: 'EASY',
    grid_size: 5,
    piece_count: 25,
    solution_order: [...canonicalSolution25],
    shuffled_order: generateShuffledArray(25)
  },
  round2: {
    id: 'puz-r2-quantum',
    title: 'Engineering Builds a Better Tomorrow',
    description: 'Multi-discipline innovation: Aerospace, Robotics, AI, Renewable Energy & Civil Engineering',
    image_url: '/puzzles/round2_quantum.webp',
    difficulty: 'EASY',
    grid_size: 5,
    piece_count: 25,
    solution_order: [...canonicalSolution25],
    shuffled_order: generateShuffledArray(25)
  }
};

// Global Match State
let gameState = {
  match_id: 'MATCH-0001',
  event_title: 'ENGINEERING DAY',
  event_subtitle: 'PUZZLE CHALLENGE',
  match_code: 'ENGDAY26',
  status: 'WAITING', // WAITING, COUNTDOWN, ROUND_1, ROUND_2, PAUSED, STOPPED, COMPLETED
  previous_status: null,
  current_round: 1,
  max_players: 40,
  
  // Timing
  round_1_duration_seconds: 180,
  round_2_duration_seconds: 600,
  match_duration_seconds: 600,
  round_1_start_at: null,
  round_1_end_at: null,
  round_2_start_at: null,
  round_2_end_at: null,
  match_start_time: null,
  match_end_time: null,
  
  // Synchronized countdown (3-2-1-GO)
  countdown_start_at: null,
  countdown_target_at: null,
  
  is_paused: false,
  paused_at: null,
  total_paused_ms: 0,
  stop_reason: null,
  version: 1,
  
  puzzles: {
    1: initialPuzzles.round1,
    2: initialPuzzles.round2
  }
};

// In-Memory fast lookup caches synced with SQLite
const players = new Map();
const usernamesMap = new Map();
const processedRequests = new Map();
const adminSessions = new Set();
const clients = new Map();

// Initialize from Persistent Database
try {
  const persistedState = db.loadMatchState();
  if (persistedState) {
    gameState = { ...gameState, ...persistedState };
  }
  const persistedPlayers = db.getAllPlayers();
  for (const p of persistedPlayers) {
    players.set(p.session_token, p);
    usernamesMap.set(p.username_normalized, p.session_token);
  }
  console.log(`📦 Loaded ${persistedPlayers.length} players and match state (${gameState.status}) from database.`);
} catch (err) {
  console.error('Error loading initial database state:', err);
}

// Real-Time Broadcast Helpers
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, server_now: Date.now() });
  for (const [ws] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function broadcastGameState() {
  const publicState = getPublicMatchState();
  broadcast('MATCH_STATE_UPDATE', publicState);
}

function broadcastPlayersList() {
  const playersList = Array.from(players.values()).map(p => ({
    id: p.player_id || p.id,
    player_id: p.player_id || p.id,
    name: p.name || p.username,
    username: p.name || p.username,
    animal_id: p.animal_id,
    hat_id: p.hat_id || 'none',
    glasses_id: p.glasses_id || 'none',
    outfit_id: p.outfit_id || 'none',
    status: p.player_status || p.status,
    game_status: p.game_status || p.status,
    player_status: p.player_status || p.status,
    join_type: p.join_type || 'NORMAL',
    admitted_by_admin: Boolean(p.admitted_by_admin),
    admitted_at: p.admitted_at,
    round_1_reward_claimed: Boolean(p.round_1_reward_claimed),
    round_2_reward_claimed: Boolean(p.round_2_reward_claimed),
    connection_status: p.connection_status,
    joined_at: p.joined_at,
    last_seen_at: p.last_seen_at,
    round_1_score: p.round_1_score || 0,
    round_2_score: p.round_2_score || 0,
    total_score: (p.round_1_score || 0) + (p.round_2_score || 0),
    coins: p.coins || 0,
    completed_round_1: p.completed_round_1 || false,
    completed_round_2: p.completed_round_2 || false,
    round_1_time_ms: p.round_1_time_ms || 0,
    round_2_time_ms: p.round_2_time_ms || 0
  }));

  const activeCount = playersList.filter(p => p.player_status !== 'KICKED' && p.player_status !== 'SPECTATOR').length;

  broadcast('PLAYERS_LIST_UPDATE', {
    count: activeCount,
    total_registered: playersList.length,
    max_players: gameState.max_players,
    players: playersList
  });
}

function getPublicMatchState() {
  return {
    match_id: gameState.match_id,
    event_title: gameState.event_title,
    event_subtitle: gameState.event_subtitle,
    match_code: gameState.match_code,
    status: gameState.status,
    previous_status: gameState.previous_status,
    current_round: gameState.current_round,
    max_players: gameState.max_players,
    round_1_duration_seconds: gameState.round_1_duration_seconds,
    round_2_duration_seconds: gameState.round_2_duration_seconds,
    match_duration_seconds: gameState.match_duration_seconds,
    round_1_start_at: gameState.round_1_start_at,
    round_1_end_at: gameState.round_1_end_at,
    round_2_start_at: gameState.round_2_start_at,
    round_2_end_at: gameState.round_2_end_at,
    match_start_time: gameState.match_start_time,
    match_end_time: gameState.match_end_time,
    countdown_start_at: gameState.countdown_start_at,
    countdown_target_at: gameState.countdown_target_at,
    is_paused: gameState.is_paused,
    paused_at: gameState.paused_at,
    stop_reason: gameState.stop_reason,
    version: gameState.version,
    server_now: Date.now(),
    current_puzzle: gameState.puzzles[gameState.current_round] ? {
      id: gameState.puzzles[gameState.current_round].id,
      title: gameState.puzzles[gameState.current_round].title,
      description: gameState.puzzles[gameState.current_round].description,
      image_url: gameState.puzzles[gameState.current_round].image_url,
      difficulty: gameState.puzzles[gameState.current_round].difficulty,
      grid_size: gameState.puzzles[gameState.current_round].grid_size,
      piece_count: gameState.puzzles[gameState.current_round].piece_count,
      shuffled_order: gameState.puzzles[gameState.current_round].shuffled_order
    } : null,
    puzzles: {
      1: {
        id: gameState.puzzles[1].id,
        title: gameState.puzzles[1].title,
        description: gameState.puzzles[1].description,
        image_url: gameState.puzzles[1].image_url,
        difficulty: gameState.puzzles[1].difficulty,
        grid_size: gameState.puzzles[1].grid_size,
        piece_count: gameState.puzzles[1].piece_count
      },
      2: {
        id: gameState.puzzles[2].id,
        title: gameState.puzzles[2].title,
        description: gameState.puzzles[2].description,
        image_url: gameState.puzzles[2].image_url,
        difficulty: gameState.puzzles[2].difficulty,
        grid_size: gameState.puzzles[2].grid_size,
        piece_count: gameState.puzzles[2].piece_count
      }
    }
  };
}

// Authoritative Timer Loop (Ticker every 1 second)
setInterval(() => {
  const now = Date.now();
  if (gameState.is_paused || gameState.status === 'STOPPED' || gameState.status === 'COMPLETED' || gameState.status === 'WAITING') {
    return;
  }

  // 1. Authoritative Countdown Transition to Round 1
  if (gameState.status === 'COUNTDOWN') {
    if (gameState.countdown_target_at && now >= gameState.countdown_target_at) {
      console.log('🏁 Synchronized 3-2-1-GO Countdown concluded! Transitioning to ROUND_1.');
      const matchDurationMs = (gameState.match_duration_seconds || 600) * 1000;
      gameState.status = 'ROUND_1';
      gameState.current_round = 1;
      gameState.match_start_time = gameState.countdown_target_at;
      gameState.match_end_time = gameState.countdown_target_at + matchDurationMs;
      gameState.round_1_start_at = gameState.countdown_target_at;
      gameState.round_1_end_at = gameState.countdown_target_at + (gameState.round_1_duration_seconds * 1000);
      gameState.countdown_start_at = null;
      gameState.countdown_target_at = null;
      gameState.version++;
      db.saveMatchState(gameState);

      // Transition all eligible lobby players to PLAYING
      for (const player of players.values()) {
        if (player.player_status === 'LOBBY' || player.game_status === 'WAITING') {
          player.player_status = 'PLAYING';
          player.game_status = 'PLAYING';
          db.updatePlayerStatus(player.session_token, 'PLAYING');
        }
      }

      broadcastGameState();
      broadcastPlayersList();
      broadcast('MATCH_STARTED', {
        match_start_time: gameState.match_start_time,
        match_end_time: gameState.match_end_time
      });
      broadcast('TOAST', { message: 'Round 1 is LIVE! Solve the puzzle!' });
      db.recordAuditLog({
        matchId: gameState.match_id,
        action: 'MATCH_STARTED',
        details: 'Countdown ended. Round 1 officially began.'
      });
      return;
    }
    return;
  }

  // 2. Authoritative 10-minute overall match timer expiration
  if (gameState.match_end_time && now >= gameState.match_end_time) {
    console.log('⏰ Authoritative 10-Minute Challenge Time Expired! Transitioning to COMPLETED.');
    gameState.status = 'COMPLETED';
    gameState.version++;
    db.saveMatchState(gameState);

    for (const player of players.values()) {
      if (!player.completed_round_2 && player.player_status !== 'KICKED') {
        player.player_status = 'TIME_UP';
        player.status = 'TIME_UP';
        player.game_status = 'TIME_UP';
      }
    }

    broadcastGameState();
    broadcastPlayersList();
    broadcast('MATCH_COMPLETED', { reason: 'TIME_EXPIRED', message: "Time is up! Your result has been saved." });
    db.recordAuditLog({
      matchId: gameState.match_id,
      action: 'MATCH_ENDED_TIME_EXPIRED',
      details: 'Global 10-minute match timer expired.'
    });
    return;
  }

  // 3. Round 1 auto-transition if individual round timer expires
  if (gameState.status === 'ROUND_1' && gameState.round_1_end_at && now >= gameState.round_1_end_at) {
    console.log('⏰ Round 1 time expired. Transitioning to Round 2.');
    gameState.status = 'ROUND_2';
    gameState.current_round = 2;
    gameState.version++;
    db.saveMatchState(gameState);

    for (const player of players.values()) {
      if (!player.completed_round_1 && player.player_status === 'PLAYING') {
        player.player_status = 'PLAYING';
        player.status = 'ROUND_2_PLAYING';
      }
    }

    broadcastGameState();
    broadcastPlayersList();
    broadcast('TOAST', { message: "Round 1 time is up! Moving to Round 2." });
  }
}, 250);

// Heartbeat & Connection presence check
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const player of players.values()) {
    if (player.connection_status === 'connected' && now - player.last_seen_at > 20000) {
      player.connection_status = 'disconnected';
      changed = true;
    }
  }
  if (changed) {
    broadcastPlayersList();
  }
}, 8000);

// ==========================================================
// REST API ENDPOINTS
// ==========================================================

// Get Available Mascots
app.get('/api/avatars', (req, res) => {
  res.json({ success: true, avatars: avatarsList });
});

// Get Current Match State
app.get('/api/match/state', (req, res) => {
  res.json({ success: true, state: getPublicMatchState() });
});

// Get Public Lobby Players
app.get('/api/lobby/players', (req, res) => {
  const allPlayers = db.getAllPlayers();
  const activeCount = allPlayers.filter(p => p.player_status !== 'KICKED' && p.player_status !== 'SPECTATOR').length;
  res.json({
    success: true,
    count: activeCount,
    total_registered: allPlayers.length,
    max_players: gameState.max_players,
    players: allPlayers
  });
});

// Get Leaderboard Alias
app.get('/api/leaderboard', (req, res) => {
  const all = db.getAllPlayers();
  res.json({ success: true, leaderboard: all });
});

// Check Username Availability
app.get('/api/player/check-username', (req, res) => {
  const rawName = (req.query.name || '').toString();
  const clean = rawName.trim();
  if (clean.length < 3) {
    return res.json({ available: false, message: 'Username must be at least 3 characters.' });
  }
  if (clean.length > 20) {
    return res.json({ available: false, message: 'Username cannot exceed 20 characters.' });
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(clean)) {
    return res.json({ available: false, message: 'Username can only contain letters, numbers, and spaces.' });
  }

  const available = db.isUsernameAvailable(clean);
  if (!available) {
    return res.json({ available: false, message: 'Username is already here. Try a new name.' });
  }

  return res.json({ available: true, message: 'Username available' });
});

// Player Join / Register (Authoritative Rules)
app.post('/api/player/join', (req, res) => {
  const { name, animal_id, hat_id, glasses_id, outfit_id, session_token } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Player name is required.' });
  }

  const cleanName = name.trim();
  if (cleanName.length < 3 || cleanName.length > 20) {
    return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters.' });
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanName)) {
    return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and spaces.' });
  }

  const validAvatar = avatarsList.some(a => a.id === animal_id);
  if (!validAvatar) {
    return res.status(400).json({ success: false, error: 'Invalid mascot selected.' });
  }

  const token = session_token || uuidv4();
  const lowerName = cleanName.toLowerCase();

  // 1. Reconnection / Session recovery for existing token
  const existingPlayer = db.getPlayerByToken(token);
  if (existingPlayer) {
    if (existingPlayer.username_normalized !== lowerName) {
      if (!db.isUsernameAvailable(cleanName)) {
        return res.status(400).json({ success: false, error: 'Username is already here. Try a new name.' });
      }
    }
    const updated = db.updatePlayerAvatar(token, {
      animal_id,
      hat_id: hat_id || 'none',
      glasses_id: glasses_id || 'none',
      outfit_id: outfit_id || 'none'
    });
    db.recordHeartbeat(token);
    players.set(token, updated);
    usernamesMap.set(lowerName, token);
    broadcastPlayersList();
    return res.json({
      success: true,
      player: updated,
      session_token: token,
      match_state: getPublicMatchState(),
      is_late_joiner: updated.join_type === 'LATE'
    });
  }

  // 2. Prevent duplicate username registration from another session
  const existingByName = db.getPlayerByUsername(cleanName);
  if (existingByName) {
    if (!session_token || session_token !== existingByName.session_token) {
      return res.status(409).json({ success: false, error: 'Username is already here. Try a new name.' });
    }
    const updated = db.updatePlayerAvatar(existingByName.session_token, {
      animal_id,
      hat_id: hat_id || 'none',
      glasses_id: glasses_id || 'none',
      outfit_id: outfit_id || 'none'
    });
    db.recordHeartbeat(existingByName.session_token);
    players.set(existingByName.session_token, updated || existingByName);
    usernamesMap.set(lowerName, existingByName.session_token);
    broadcastPlayersList();
    return res.json({
      success: true,
      player: updated || existingByName,
      session_token: existingByName.session_token,
      match_state: getPublicMatchState(),
      is_late_joiner: (updated || existingByName).join_type === 'LATE'
    });
  }

  // 3. Stopped or Concluded Match Check
  if (gameState.status === 'STOPPED') {
    return res.status(400).json({ success: false, error: 'Match has been stopped by the administrator.' });
  }
  if (gameState.status === 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'Match has concluded.' });
  }

  // 4. Capacity Limit Enforcement (Max 40 by default, configurable)
  if (db.getPlayerCount() >= gameState.max_players) {
    return res.status(403).json({ success: false, error: 'Lobby is full. Please contact the event coordinator.' });
  }

  // 5. Late Joiner vs Normal Joiner Determination
  const isMatchActive = gameState.status === 'COUNTDOWN' ||
    gameState.status === 'ROUND_1' ||
    gameState.status === 'ROUND_2' ||
    gameState.status === 'PAUSED';

  const join_type = isMatchActive ? 'LATE' : 'NORMAL';
  const player_status = isMatchActive ? 'SPECTATOR' : 'LOBBY';
  const game_status = isMatchActive ? 'SPECTATOR' : 'WAITING';

  const playerShuffledR1 = generateShuffledArray(25);
  const playerShuffledR2 = generateShuffledArray(25);

  try {
    const newPlayer = db.createPlayerRecord({
      username: cleanName,
      animal_id,
      hat_id: hat_id || 'none',
      glasses_id: glasses_id || 'none',
      outfit_id: outfit_id || 'none',
      session_token: token,
      shuffled_puzzle_r1: playerShuffledR1,
      shuffled_puzzle_r2: playerShuffledR2,
      game_status,
      player_status,
      join_type,
      admitted_by_admin: 0
    });

    players.set(token, newPlayer);
    usernamesMap.set(lowerName, token);
    broadcastPlayersList();

    if (join_type === 'LATE') {
      broadcast('TOAST', { message: `${cleanName} joined as a spectator (Match in progress)` });
    } else {
      broadcast('TOAST', { message: `${cleanName} (${newPlayer.player_id}) joined the lobby` });
    }

    res.json({
      success: true,
      player: newPlayer,
      session_token: token,
      match_state: getPublicMatchState(),
      is_late_joiner: join_type === 'LATE'
    });
  } catch (err) {
    if (err.code === 'USERNAME_TAKEN' || (err.message && err.message.includes('UNIQUE constraint'))) {
      return res.status(409).json({ success: false, error: 'Username is already here. Try a new name.' });
    }
    console.error('Join error:', err);
    res.status(500).json({ success: false, error: 'Failed to join challenge.' });
  }
});

// Update Player Avatar
app.post('/api/player/update-avatar', (req, res) => {
  const { session_token, animal_id, hat_id, glasses_id, outfit_id } = req.body;
  if (!session_token) {
    return res.status(400).json({ success: false, error: 'Session token required.' });
  }
  const updated = db.updatePlayerAvatar(session_token, { animal_id, hat_id, glasses_id, outfit_id });
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Player not found.' });
  }
  players.set(session_token, updated);
  broadcastPlayersList();
  res.json({ success: true, player: updated });
});

// Restore Player Session
app.get('/api/player/session/:token', (req, res) => {
  const { token } = req.params;
  const player = db.getPlayerByToken(token);
  if (!player) {
    return res.status(404).json({ success: false, error: 'Session not found or expired.' });
  }
  db.recordHeartbeat(token);
  player.connection_status = 'connected';
  players.set(token, player);
  broadcastPlayersList();

  res.json({
    success: true,
    player,
    match_state: getPublicMatchState()
  });
});

// Player Heartbeat
app.post('/api/player/heartbeat', (req, res) => {
  const { session_token } = req.body;
  if (session_token) {
    db.recordHeartbeat(session_token);
    const player = players.get(session_token);
    if (player) {
      player.last_seen_at = Date.now();
      player.connection_status = 'connected';
    }
    return res.json({ success: true, server_now: Date.now() });
  }
  res.json({ success: false });
});

// Advance to Round 2
app.post('/api/player/advance-round-2', (req, res) => {
  const { session_token } = req.body;
  if (!session_token) {
    return res.status(401).json({ success: false, error: 'Invalid session.' });
  }

  const existing = db.getPlayerByToken(session_token);
  if (!existing || !existing.completed_round_1) {
    return res.status(400).json({ success: false, error: 'Round 1 not yet completed.' });
  }

  const updatedPlayer = db.advancePlayerToRound2(session_token);
  players.set(session_token, updatedPlayer);
  broadcastPlayersList();
  res.json({ success: true, player: updatedPlayer });
});

// Authoritative Puzzle Submission with Exact Coin Ledger & Idempotency
app.post('/api/puzzle/submit', (req, res) => {
  const { session_token, round_number, solution_order, move_count, request_id } = req.body;

  if (request_id && processedRequests.has(request_id)) {
    return res.json(processedRequests.get(request_id));
  }

  if (!session_token) {
    return res.status(401).json({ success: false, error: 'Invalid session.' });
  }

  const player = db.getPlayerByToken(session_token);
  if (!player) {
    return res.status(404).json({ success: false, error: 'Player record not found.' });
  }

  // 1. Kick & Spectator Checks
  if (player.player_status === 'KICKED' || player.status === 'KICKED') {
    return res.status(403).json({ success: false, error: 'You have been removed from the match.' });
  }
  if (player.player_status === 'SPECTATOR' || player.status === 'SPECTATOR') {
    return res.status(400).json({ success: false, error: 'Spectators cannot submit puzzle solutions. Please contact the administrator.' });
  }

  // 2. Match Active Checks
  if (gameState.status === 'STOPPED') {
    return res.status(400).json({ success: false, error: 'Challenge is currently stopped by administrator.' });
  }
  if (gameState.status === 'PAUSED' || gameState.is_paused) {
    return res.status(400).json({ success: false, error: 'Challenge is currently paused.' });
  }

  const now = Date.now();
  if (gameState.match_end_time && now >= gameState.match_end_time) {
    return res.status(400).json({ success: false, error: 'Challenge time has expired.' });
  }

  // 3. Verify Round Eligibility
  if (round_number === 1) {
    if (player.completed_round_1) {
      return res.status(400).json({ success: false, error: 'Round 1 has already been completed.' });
    }
  } else if (round_number === 2) {
    if (!player.completed_round_1) {
      return res.status(400).json({ success: false, error: 'Must complete Round 1 first.' });
    }
    if (player.completed_round_2) {
      return res.status(400).json({ success: false, error: 'Round 2 has already been completed.' });
    }
  } else {
    return res.status(400).json({ success: false, error: 'Invalid round number.' });
  }

  // 4. Verify 25-piece canonical order: [0, 1, 2, ..., 24]
  if (!Array.isArray(solution_order) || solution_order.length !== 25) {
    return res.json({ success: true, correct: false, error: 'Invalid piece count. Expected 25 pieces.' });
  }

  const isCorrect = solution_order.every((val, idx) => val === idx);
  if (!isCorrect) {
    return res.json({ success: true, correct: false, message: 'Puzzle is not yet complete.' });
  }

  // 5. Authoritative Scoring & Coins Calculation
  // Round 1 reward: exactly 100 coins. Round 2 reward: exactly 200 coins
  const baseScore = round_number === 1 ? 100 : 200;
  const configuredRewardCoins = round_number === 1 ? 100 : 200;

  const matchStart = gameState.match_start_time || gameState.round_1_start_at || now;
  const matchEnd = gameState.match_end_time || now + 600000;
  const solveTimeMs = Math.max(0, now - matchStart);
  const remainingSeconds = Math.max(0, Math.floor((matchEnd - now) / 1000));

  const timeBonus = Math.round(remainingSeconds * (round_number === 1 ? 0.5 : 1.0));
  const moves = Math.max(1, move_count || 1);
  const idealMoves = round_number === 1 ? 25 : 35;
  const moveBonus = Math.max(0, (idealMoves - moves) * 2);
  const awardedScore = baseScore + timeBonus + moveBonus;

  // DB completion with atomic transaction & coin ledger insertion
  const { updated, alreadyClaimed, player: updatedPlayer } = db.completeRound({
    sessionToken: session_token,
    roundNumber: round_number,
    awardedScore,
    moves,
    solveTimeMs,
    matchId: gameState.match_id
  });

  if (updatedPlayer) {
    players.set(session_token, updatedPlayer);
  }

  const finalPlayer = updatedPlayer || player;

  const responsePayload = {
    success: true,
    correct: true,
    round_number,
    awarded_score: awardedScore,
    coins_earned: alreadyClaimed ? 0 : configuredRewardCoins,
    total_coins: finalPlayer.coins,
    total_score: finalPlayer.total_score,
    solve_time_ms: solveTimeMs,
    remaining_seconds: remainingSeconds,
    next_round: round_number === 1 ? 2 : null
  };

  if (request_id) {
    processedRequests.set(request_id, responsePayload);
  }

  broadcastPlayersList();
  broadcast('PLAYER_COMPLETED', {
    player_id: finalPlayer.player_id || finalPlayer.id,
    player_name: finalPlayer.name,
    animal_id: finalPlayer.animal_id,
    round_number,
    score: awardedScore,
    coins: configuredRewardCoins
  });

  res.json(responsePayload);
});

// Leaderboard Endpoint
app.get('/api/match/leaderboard', (req, res) => {
  const all = db.getAllPlayers();
  res.json({ success: true, leaderboard: all });
});

// ==========================================================
// ADMIN CONTROL ENDPOINTS
// ==========================================================

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminSessions.has(token)) {
    return res.status(403).json({ success: false, error: 'Unauthorized admin action.' });
  }
  next();
}

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    const adminToken = `admin-${uuidv4()}`;
    adminSessions.add(adminToken);
    return res.json({ success: true, admin_token: adminToken });
  }
  res.status(401).json({ success: false, error: 'Invalid admin code.' });
});

// Update Match Settings (Max Players, Match Duration)
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { max_players, match_duration, round_1_duration, round_2_duration } = req.body;
  if (typeof max_players === 'number' && max_players > 0) {
    gameState.max_players = max_players;
  }
  if (typeof match_duration === 'number' && match_duration > 0) {
    gameState.match_duration_seconds = match_duration;
  }
  if (typeof round_1_duration === 'number' && round_1_duration > 0) {
    gameState.round_1_duration_seconds = round_1_duration;
  }
  if (typeof round_2_duration === 'number' && round_2_duration > 0) {
    gameState.round_2_duration_seconds = round_2_duration;
  }
  gameState.version++;
  db.saveMatchState(gameState);
  broadcastGameState();
  broadcastPlayersList();
  res.json({ success: true, match_state: getPublicMatchState() });
});

// Verify Emergency Admission Code (0000)
app.post('/api/admin/verify-emergency-code', requireAdmin, (req, res) => {
  const { code } = req.body;
  if (code === EMERGENCY_REJOIN_CODE) {
    return res.json({ success: true, verified: true });
  }
  res.status(401).json({ success: false, error: 'Invalid emergency code.' });
});

// Get Admin Players List
app.get('/api/admin/players', requireAdmin, (req, res) => {
  const allPlayers = db.getAllPlayers();
  res.json({ success: true, players: allPlayers });
});

// Get Late Joiners / Spectators
app.get('/api/admin/late-joiners', requireAdmin, (req, res) => {
  const lateJoiners = db.getLateJoiners();
  res.json({ success: true, late_joiners: lateJoiners });
});

// Get Kicked Players
app.get('/api/admin/kicked-players', requireAdmin, (req, res) => {
  const kicked = db.getKickedPlayers();
  res.json({ success: true, kicked_players: kicked });
});

// Get Coin Transaction Ledger
app.get('/api/admin/coin-transactions', requireAdmin, (req, res) => {
  const playerId = req.query.player_id;
  const transactions = db.getCoinTransactions(playerId);
  res.json({ success: true, transactions });
});

// Get Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const logs = db.getAuditLogs();
  res.json({ success: true, logs });
});

// 1. START MATCH: Initiates Synchronized 3-2-1-GO Countdown
app.post('/api/admin/start-match', requireAdmin, (req, res) => {
  if (gameState.status === 'COUNTDOWN') {
    return res.status(400).json({ success: false, error: 'Match countdown is already in progress.' });
  }
  if (gameState.status === 'ROUND_1' || gameState.status === 'ROUND_2') {
    return res.status(400).json({ success: false, error: 'Match is already running.' });
  }

  const now = Date.now();
  gameState.status = 'COUNTDOWN';
  gameState.countdown_start_at = now;
  gameState.countdown_target_at = now + 4000; // 4 seconds total (3, 2, 1, GO)
  gameState.is_paused = false;
  gameState.stop_reason = null;
  gameState.version++;

  db.saveMatchState(gameState);
  db.recordAuditLog({
    matchId: gameState.match_id,
    action: 'MATCH_COUNTDOWN_STARTED',
    details: { target_start_at: gameState.countdown_target_at }
  });

  broadcastGameState();
  broadcast('MATCH_COUNTDOWN', {
    countdown_start_at: gameState.countdown_start_at,
    countdown_target_at: gameState.countdown_target_at,
    server_now: now
  });
  broadcast('TOAST', { message: 'Match starting! 3... 2... 1...' });

  res.json({ success: true, match_state: getPublicMatchState() });
});

// 2. STOP MATCH: Freezes timer, disables moves, sets STOPPED in DB & RAM, notifies all clients
app.post('/api/admin/stop-match', requireAdmin, (req, res) => {
  if (gameState.status === 'STOPPED') {
    return res.status(400).json({ success: false, error: 'Match is already stopped.' });
  }

  gameState.previous_status = gameState.status;
  gameState.status = 'STOPPED';
  gameState.stop_reason = 'The administrator has stopped this challenge.';
  gameState.countdown_start_at = null;
  gameState.countdown_target_at = null;
  gameState.version++;

  db.saveMatchState(gameState);
  db.updateAllActivePlayersStatus('STOPPED');
  db.recordAuditLog({
    matchId: gameState.match_id,
    action: 'MATCH_STOPPED',
    details: gameState.stop_reason
  });

  for (const p of players.values()) {
    if (p.player_status !== 'COMPLETED' && p.player_status !== 'KICKED') {
      p.player_status = 'STOPPED';
      p.status = 'STOPPED';
    }
  }

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_STOPPED', {
    reason: gameState.stop_reason,
    message: 'The administrator has stopped this challenge.'
  });
  broadcast('TOAST', { message: 'Match stopped by administrator' });

  res.json({ success: true, match_state: getPublicMatchState() });
});

// 3. PAUSE MATCH
app.post('/api/admin/pause', requireAdmin, (req, res) => {
  if (gameState.is_paused || gameState.status === 'STOPPED' || gameState.status === 'WAITING' || gameState.status === 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'Cannot pause match in current state.' });
  }
  gameState.previous_status = gameState.status;
  gameState.status = 'PAUSED';
  gameState.is_paused = true;
  gameState.paused_at = Date.now();
  gameState.version++;
  db.saveMatchState(gameState);
  db.recordAuditLog({ matchId: gameState.match_id, action: 'MATCH_PAUSED', details: { paused_at: gameState.paused_at } });

  broadcastGameState();
  broadcast('MATCH_PAUSED', { paused_at: gameState.paused_at });
  broadcast('TOAST', { message: 'Match paused by administrator' });
  res.json({ success: true, is_paused: true, match_state: getPublicMatchState() });
});

// 4. RESUME MATCH
app.post('/api/admin/resume', requireAdmin, (req, res) => {
  if (!gameState.is_paused && gameState.status !== 'PAUSED') {
    return res.status(400).json({ success: false, error: 'Match is not paused.' });
  }
  const pausedDuration = Date.now() - (gameState.paused_at || Date.now());
  gameState.status = gameState.previous_status || 'ROUND_1';
  gameState.is_paused = false;
  gameState.paused_at = null;
  gameState.total_paused_ms += pausedDuration;

  if (gameState.match_end_time) {
    gameState.match_end_time += pausedDuration;
  }
  if (gameState.round_1_end_at) {
    gameState.round_1_end_at += pausedDuration;
  }
  if (gameState.round_2_end_at) {
    gameState.round_2_end_at += pausedDuration;
  }
  gameState.version++;
  db.saveMatchState(gameState);
  db.recordAuditLog({ matchId: gameState.match_id, action: 'MATCH_RESUMED', details: { pausedDuration } });

  broadcastGameState();
  broadcast('MATCH_RESUMED', { server_now: Date.now() });
  broadcast('TOAST', { message: 'Match resumed' });
  res.json({ success: true, is_paused: false, match_state: getPublicMatchState() });
});

// 5. RESET MATCH
app.post('/api/admin/reset-match', requireAdmin, (req, res) => {
  gameState.status = 'WAITING';
  gameState.previous_status = null;
  gameState.current_round = 1;
  gameState.match_start_time = null;
  gameState.match_end_time = null;
  gameState.round_1_start_at = null;
  gameState.round_1_end_at = null;
  gameState.round_2_start_at = null;
  gameState.round_2_end_at = null;
  gameState.countdown_start_at = null;
  gameState.countdown_target_at = null;
  gameState.is_paused = false;
  gameState.paused_at = null;
  gameState.stop_reason = null;
  gameState.version++;

  if (req.body && req.body.clear_players) {
    db.clearAllData();
    players.clear();
    usernamesMap.clear();
  } else {
    db.resetAllPlayers();
  }
  db.saveMatchState(gameState);
  db.recordAuditLog({ matchId: gameState.match_id, action: 'MATCH_RESET', details: 'Reset match back to WAITING lobby.' });

  for (const p of players.values()) {
    if (p.player_status !== 'KICKED') {
      p.status = 'WAITING';
      p.game_status = 'WAITING';
      p.player_status = 'LOBBY';
      p.join_type = 'NORMAL';
      p.admitted_by_admin = false;
      p.admitted_at = null;
      p.round_1_score = 0;
      p.round_2_score = 0;
      p.total_score = 0;
      p.coins = 0;
      p.completed_round_1 = false;
      p.completed_round_2 = false;
      p.round_1_moves = 0;
      p.round_2_moves = 0;
      p.round_1_time_ms = 0;
      p.round_2_time_ms = 0;
      p.shuffled_puzzle_r1 = generateShuffledArray(25);
      p.shuffled_puzzle_r2 = generateShuffledArray(25);
    }
  }

  processedRequests.clear();

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_RESET', { message: 'Match progress has been reset by organizer.' });
  broadcast('TOAST', { message: 'Match reset to lobby' });

  res.json({ success: true, match_state: getPublicMatchState() });
});

// 6. END MATCH
app.post('/api/admin/end-match', requireAdmin, (req, res) => {
  gameState.status = 'COMPLETED';
  gameState.version++;
  db.saveMatchState(gameState);
  db.recordAuditLog({ matchId: gameState.match_id, action: 'MATCH_ENDED', details: 'Admin ended match manually.' });

  for (const p of players.values()) {
    if (p.player_status !== 'COMPLETED' && p.player_status !== 'KICKED') {
      p.player_status = 'COMPLETED';
      p.status = 'COMPLETED';
    }
  }

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_COMPLETED', { message: 'Challenge has concluded!' });
  res.json({ success: true, match_state: getPublicMatchState() });
});

// 7. ADMIT LATE PLAYER (Protected Emergency Action)
app.post('/api/admin/admit-player', requireAdmin, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) {
    return res.status(400).json({ success: false, error: 'Player ID is required.' });
  }

  const updatedPlayer = db.admitPlayer(player_id);
  if (!updatedPlayer) {
    return res.status(404).json({ success: false, error: 'Player not found.' });
  }

  // Update in cache
  for (const [token, p] of players.entries()) {
    if (p.player_id === player_id || p.id === player_id) {
      p.player_status = 'PLAYING';
      p.status = 'PLAYING';
      p.game_status = 'PLAYING';
      p.admitted_by_admin = true;
      p.admitted_at = Date.now();
      break;
    }
  }

  db.recordAuditLog({
    matchId: gameState.match_id,
    action: 'PLAYER_ADMITTED',
    targetPlayerId: player_id,
    details: 'Admitted into active match by administrator'
  });

  broadcastPlayersList();
  broadcast('PLAYER_ADMITTED', {
    player_id,
    player: updatedPlayer,
    current_round: gameState.current_round
  });
  broadcast('TOAST', { message: `${updatedPlayer.name} has been admitted to the match!` });

  res.json({ success: true, player: updatedPlayer });
});

// 8. KICK PLAYER (Persistent with confirmation audit)
app.post('/api/admin/kick-player', requireAdmin, (req, res) => {
  const { player_id, reason } = req.body;
  if (!player_id) {
    return res.status(400).json({ success: false, error: 'Player ID is required.' });
  }

  const kickedPlayer = db.kickPlayer(player_id, reason || 'Removed by administrator');
  if (!kickedPlayer) {
    return res.status(404).json({ success: false, error: 'Player not found.' });
  }

  for (const [token, p] of players.entries()) {
    if (p.player_id === player_id || p.id === player_id) {
      p.player_status = 'KICKED';
      p.status = 'KICKED';
      p.game_status = 'KICKED';
      p.connection_status = 'disconnected';
      break;
    }
  }

  db.recordAuditLog({
    matchId: gameState.match_id,
    action: 'PLAYER_KICKED',
    targetPlayerId: player_id,
    details: reason || 'Removed by administrator'
  });

  broadcastPlayersList();
  broadcast('PLAYER_KICKED', {
    player_id,
    message: 'You have been removed from the match by an administrator.'
  });
  broadcast('TOAST', { message: `${kickedPlayer.name} was removed from the match` });

  res.json({ success: true, player: kickedPlayer });
});

// Remove Player (Permanent Deletion)
app.post('/api/admin/remove-player', requireAdmin, (req, res) => {
  const { player_id } = req.body;
  db.removePlayer(player_id);

  for (const [token, p] of players.entries()) {
    if (p.id === player_id || p.player_id === player_id) {
      usernamesMap.delete(p.username_normalized || p.name.toLowerCase());
      players.delete(token);
      broadcastPlayersList();
      return res.json({ success: true });
    }
  }
  res.status(404).json({ success: false, error: 'Player not found.' });
});

// Clear All Players
app.post('/api/admin/clear-all-players', requireAdmin, (req, res) => {
  db.clearAllPlayers();
  players.clear();
  usernamesMap.clear();
  processedRequests.clear();
  broadcastPlayersList();
  broadcast('TOAST', { message: 'All player records have been cleared by admin.' });
  res.json({ success: true, message: 'All players cleared.', player_count: 0 });
});

// Update settings
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { match_duration, max_players } = req.body;
  if (match_duration && match_duration >= 60) {
    gameState.match_duration_seconds = parseInt(match_duration);
  }
  if (max_players && max_players >= 1 && max_players <= 100) {
    gameState.max_players = parseInt(max_players);
  }
  gameState.version++;
  db.saveMatchState(gameState);
  broadcastGameState();
  broadcastPlayersList();
  res.json({ success: true, state: getPublicMatchState() });
});

// Export Results CSV
app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
  const allPlayers = db.getAllPlayers();
  let csv = 'Rank,Player ID,Player Name,Mascot,Hat,Glasses,Outfit,Round 1 Score,Round 2 Score,Total Score,Coins,Status,Join Type,Admitted\n';
  allPlayers.forEach((p, idx) => {
    csv += `${idx + 1},${p.player_id},"${p.name.replace(/"/g, '""')}",${p.animal_id},${p.hat_id},${p.glasses_id},${p.outfit_id},${p.round_1_score},${p.round_2_score},${p.total_score},${p.coins},${p.player_status || p.status},${p.join_type},${p.admitted_by_admin ? 'YES' : 'NO'}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="engineering_day_results.csv"');
  res.send(csv);
});

// Gemini AI Puzzle Generator
app.post('/api/admin/generate-puzzle', requireAdmin, async (req, res) => {
  const { topic, difficulty } = req.body;

  if (!genAI) {
    return res.json({
      success: true,
      puzzle: {
        title: `${topic || 'Engineering Innovation'} Showcase`,
        theme: topic || 'Advanced Robotics',
        image_prompt: `Isometric 3D concept of ${topic || 'engineering innovation'} with vibrant circuits and clean engineering workstation.`,
        difficulty: difficulty || 'EASY',
        grid_size: 5,
        piece_count: 25,
        educational_context: `Practical engineering design in ${topic || 'modern robotics'}.`
      }
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are designing a 5x5 (25-piece) puzzle for College Engineering Day.
Topic: "${topic || 'Future of Robotics'}".
Difficulty: "${difficulty || 'EASY'}".

Respond with a JSON object containing:
- title: Short engaging puzzle title (max 60 chars)
- theme: Core engineering discipline
- image_prompt: Detailed creative prompt suitable for generating an engineering illustration
- difficulty: "EASY" or "HARD"
- grid_size: 5
- piece_count: 25
- educational_context: Brief 1-sentence engineering trivia.

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    res.json({ success: true, puzzle: parsed });
  } catch (err) {
    console.error('Gemini puzzle generation error:', err);
    res.status(500).json({ success: false, error: 'Gemini AI generation failed.' });
  }
});

// 404 handler for unknown API routes (guarantees JSON instead of Express HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler for API routes
app.use('/api', (err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ==========================================================
// WEBSOCKET REAL-TIME PRESENCE & SYNCHRONIZATION
// ==========================================================

wss.on('connection', (ws) => {
  clients.set(ws, { sessionToken: null, isAdmin: false });

  ws.send(JSON.stringify({
    type: 'INIT_SYNC',
    payload: {
      match_state: getPublicMatchState(),
      server_now: Date.now()
    }
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'IDENTIFY') {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          clientInfo.sessionToken = msg.session_token;
          clientInfo.isAdmin = !!msg.is_admin;
        }
      } else if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', server_now: Date.now() }));
      }
    } catch (e) {
      // Ignore
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err.message);
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

wss.on('error', (err) => {
  console.error('WebSocket server error:', err.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Engineering Day Puzzle Challenge Server running on port ${PORT} (0.0.0.0)`);
  console.log(`📡 WebSocket endpoint ready at ws://0.0.0.0:${PORT}/ws`);
  console.log(`🔑 Admin initial access code: ${ADMIN_CODE}`);
  console.log(`🛡️ Emergency Admission Rejoin Code: ${EMERGENCY_REJOIN_CODE}`);
});
