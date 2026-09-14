import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_CODE = process.env.ADMIN_INITIAL_CODE || 'admin@123';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

let genAI = null;
if (GEMINI_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
}

// ==========================================================
// 12 CARTOON ANIMAL MASCOTS (Consistent illustration style)
// ==========================================================
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
  { id: 'elephant', name: 'Elephant', image_url: '/avatars/elephant.png', accent_color: '#64748B' }
];

// Helper to generate non-trivial shuffled permutation for a 25-piece grid
function generateShuffledArray(size = 25) {
  const arr = Array.from({ length: size }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure not solved already
  let matches = 0;
  for (let i = 0; i < size; i++) {
    if (arr[i] === i) matches++;
  }
  if (matches > 2) {
    // Swap two elements
    [arr[0], arr[size - 1]] = [arr[size - 1], arr[0]];
    [arr[1], arr[size - 2]] = [arr[size - 2], arr[1]];
  }
  return arr;
}

// Canonical 25-piece solution
const canonicalSolution25 = Array.from({ length: 25 }, (_, i) => i);

const initialPuzzles = {
  round1: {
    id: 'puz-r1-robotics',
    title: 'Robotics & Automation Laboratory',
    description: 'Precision mechanical assembly and autonomous sensor array',
    image_url: '/puzzles/round1_robotics.webp',
    difficulty: 'EASY',
    grid_size: 5,
    piece_count: 25,
    solution_order: [...canonicalSolution25],
    shuffled_order: generateShuffledArray(25)
  },
  round2: {
    id: 'puz-r2-quantum',
    title: 'Quantum Core & Supercomputing Cleanroom',
    description: 'Advanced aerospace quantum processor and cryogenic manifold',
    image_url: '/puzzles/round2_quantum.webp',
    difficulty: 'HARD',
    grid_size: 5,
    piece_count: 25,
    solution_order: [...canonicalSolution25],
    shuffled_order: generateShuffledArray(25)
  }
};

// Authoritative Match State
let gameState = {
  match_id: 'match-eng-2026-01',
  event_title: 'ENGINEERING DAY',
  event_subtitle: 'PUZZLE CHALLENGE',
  match_code: 'ENGDAY26',
  status: 'WAITING', // WAITING, STARTING, ROUND_1, ROUND_2, PAUSED, STOPPED, COMPLETED
  previous_status: null,
  current_round: 1,
  max_players: 40,
  
  // Timing (Authoritative 10-Minute Total Challenge: 600s)
  round_1_duration_seconds: 180, // 3 mins default for Round 1
  round_2_duration_seconds: 600, // 10 mins strictly for Hard Round
  match_duration_seconds: 600,   // 10 minutes total match timer
  round_1_start_at: null,
  round_1_end_at: null,
  round_2_start_at: null,
  round_2_end_at: null,
  match_start_time: null,
  match_end_time: null,
  
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

// Players map: sessionToken -> playerObject
const players = new Map();
// Case-insensitive username uniqueness map: lowercaseName -> sessionToken
const usernamesMap = new Map();
// Idempotency cache: requestId -> responsePayload
const processedRequests = new Map();
// Admin active session tokens
const adminSessions = new Set();
// Connected WebSocket clients: ws -> { sessionToken, isAdmin }
const clients = new Map();

// Helper: Broadcast WebSocket message
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
    id: p.id,
    name: p.name,
    animal_id: p.animal_id,
    hat_id: p.hat_id || 'none',
    glasses_id: p.glasses_id || 'none',
    outfit_id: p.outfit_id || 'none',
    status: p.status,
    connection_status: p.connection_status,
    joined_at: p.joined_at,
    round_1_score: p.round_1_score || 0,
    round_2_score: p.round_2_score || 0,
    total_score: (p.round_1_score || 0) + (p.round_2_score || 0),
    coins: p.coins || 0,
    completed_round_1: p.completed_round_1 || false,
    completed_round_2: p.completed_round_2 || false,
    round_1_time_ms: p.round_1_time_ms || 0,
    round_2_time_ms: p.round_2_time_ms || 0
  }));

  broadcast('PLAYERS_LIST_UPDATE', {
    count: playersList.length,
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
    } : null
  };
}

// Authoritative Timer Loop (Ticker every 1 second)
setInterval(() => {
  const now = Date.now();
  if (gameState.is_paused || gameState.status === 'STOPPED' || gameState.status === 'COMPLETED' || gameState.status === 'WAITING') {
    return;
  }

  // Check 10-minute overall match timer expiration
  if (gameState.match_end_time && now >= gameState.match_end_time) {
    console.log('⏰ Authoritative 10-Minute Challenge Time Expired! Transitioning to COMPLETED.');
    gameState.status = 'COMPLETED';
    gameState.version++;

    for (const player of players.values()) {
      if (!player.completed_round_2) {
        player.status = 'GAME_OVER';
      }
    }

    broadcastGameState();
    broadcastPlayersList();
    broadcast('MATCH_COMPLETED', { reason: 'TIME_EXPIRED', message: "Time is up! Your result has been saved." });
    return;
  }

  // Round 1 auto-transition if individual round timer expires
  if (gameState.status === 'ROUND_1' && gameState.round_1_end_at && now >= gameState.round_1_end_at) {
    console.log('⏰ Round 1 time expired.');
    gameState.status = 'ROUND_2';
    gameState.current_round = 2;
    gameState.version++;

    for (const player of players.values()) {
      if (!player.completed_round_1) {
        player.status = 'ROUND_2_PLAYING';
      }
    }

    broadcastGameState();
    broadcastPlayersList();
    broadcast('TOAST', { message: "Round 1 time is up! Moving to Round 2." });
  }
}, 1000);

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

// Avatars catalog
app.get('/api/avatars', (req, res) => {
  res.json({ success: true, avatars: avatarsList });
});

// Current match state
app.get('/api/match/state', (req, res) => {
  res.json({ success: true, state: getPublicMatchState() });
});

// Atomic & Case-Insensitive Username Availability Check
app.get('/api/player/check-username', (req, res) => {
  const rawName = req.query.name;
  if (!rawName || typeof rawName !== 'string') {
    return res.json({ available: false, message: 'Please enter a username.' });
  }

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

  const lower = clean.toLowerCase();
  if (usernamesMap.has(lower)) {
    return res.json({ available: false, message: 'Username is already here. Try a new name.' });
  }

  return res.json({ available: true, message: 'Username available' });
});

// Player Join / Register (Atomic, Idempotent, Case-Insensitive Uniqueness)
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

  // Reconnection / Session recovery
  if (players.has(token)) {
    const existing = players.get(token);
    // If updating name, check uniqueness
    const oldLower = existing.name.toLowerCase();
    if (oldLower !== lowerName) {
      if (usernamesMap.has(lowerName) && usernamesMap.get(lowerName) !== token) {
        return res.status(400).json({ success: false, error: 'Username is already here. Try a new name.' });
      }
      usernamesMap.delete(oldLower);
      usernamesMap.set(lowerName, token);
    }
    existing.name = cleanName;
    existing.animal_id = animal_id;
    existing.hat_id = hat_id || 'none';
    existing.glasses_id = glasses_id || 'none';
    existing.outfit_id = outfit_id || 'none';
    existing.connection_status = 'connected';
    existing.last_seen_at = Date.now();
    broadcastPlayersList();
    return res.json({ success: true, player: existing, session_token: token, match_state: getPublicMatchState() });
  }

  // Case-Insensitive Uniqueness Check (Mathavan == mathavan == MATHAVAN)
  if (usernamesMap.has(lowerName)) {
    return res.status(400).json({ success: false, error: 'Username is already here. Try a new name.' });
  }

  // Capacity Limit (Configurable, default 40)
  if (players.size >= gameState.max_players) {
    return res.status(403).json({ success: false, error: 'Lobby is full. Please contact the event coordinator.' });
  }

  // Prevent joining if match is already closed/completed
  if (gameState.status === 'COMPLETED' || gameState.status === 'STOPPED') {
    return res.status(403).json({ success: false, error: 'Match is already concluded.' });
  }

  // Register username in atomic index
  usernamesMap.set(lowerName, token);

  // Generate independent initial shuffled puzzle for this player
  const playerShuffledR1 = generateShuffledArray(25);
  const playerShuffledR2 = generateShuffledArray(25);

  const initialStatus = (gameState.status === 'ROUND_1' || gameState.status === 'ROUND_2') ? 'PLAYING' : 'WAITING';

  const newPlayer = {
    id: `player-${uuidv4().substring(0, 8)}`,
    name: cleanName,
    animal_id,
    hat_id: hat_id || 'none',
    glasses_id: glasses_id || 'none',
    outfit_id: outfit_id || 'none',
    status: initialStatus,
    connection_status: 'connected',
    session_token: token,
    joined_at: Date.now(),
    last_seen_at: Date.now(),
    round_1_score: 0,
    round_2_score: 0,
    total_score: 0,
    coins: 0,
    completed_round_1: false,
    completed_round_2: false,
    round_1_moves: 0,
    round_2_moves: 0,
    round_1_time_ms: 0,
    round_2_time_ms: 0,
    shuffled_puzzle_r1: playerShuffledR1,
    shuffled_puzzle_r2: playerShuffledR2
  };

  players.set(token, newPlayer);
  broadcastPlayersList();
  broadcast('TOAST', { message: `${cleanName} joined the lobby` });

  res.json({
    success: true,
    player: newPlayer,
    session_token: token,
    match_state: getPublicMatchState()
  });
});

// Restore Player Session (Page Refresh / Reconnect Handler)
app.get('/api/player/session/:token', (req, res) => {
  const { token } = req.params;
  if (!token || !players.has(token)) {
    return res.status(404).json({ success: false, error: 'Session not found or expired.' });
  }
  const player = players.get(token);
  player.connection_status = 'connected';
  player.last_seen_at = Date.now();
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
  if (session_token && players.has(session_token)) {
    const player = players.get(session_token);
    player.last_seen_at = Date.now();
    player.connection_status = 'connected';
    return res.json({ success: true, server_now: Date.now() });
  }
  res.json({ success: false });
});

// Advance to Round 2 (Independent player progression after completing Round 1)
app.post('/api/player/advance-round-2', (req, res) => {
  const { session_token } = req.body;
  if (!session_token || !players.has(session_token)) {
    return res.status(401).json({ success: false, error: 'Invalid session.' });
  }

  const player = players.get(session_token);
  if (!player.completed_round_1) {
    return res.status(400).json({ success: false, error: 'Round 1 not yet completed.' });
  }

  player.status = 'ROUND_2_PLAYING';
  broadcastPlayersList();
  res.json({ success: true, player });
});

// Puzzle Submission & Server-Authoritative Verification
app.post('/api/puzzle/submit', (req, res) => {
  const { session_token, round_number, solution_order, move_count, request_id } = req.body;

  if (!session_token || !players.has(session_token)) {
    return res.status(401).json({ success: false, error: 'Invalid player session.' });
  }

  // Idempotency: return existing result if duplicate request_id
  if (request_id && processedRequests.has(request_id)) {
    return res.json(processedRequests.get(request_id));
  }

  const player = players.get(session_token);
  const now = Date.now();

  // Authoritative State Validations
  if (gameState.status === 'STOPPED') {
    return res.status(400).json({ success: false, error: 'The administrator has stopped this challenge.' });
  }
  if (gameState.status === 'PAUSED') {
    return res.status(400).json({ success: false, error: 'The match is currently paused.' });
  }
  if (gameState.status === 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'Match is completed. No more submissions allowed.' });
  }

  // Verify Round 1 eligibility
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

  // Verify 25-piece canonical order: [0, 1, 2, ..., 24]
  if (!Array.isArray(solution_order) || solution_order.length !== 25) {
    return res.json({ success: true, correct: false, error: 'Invalid piece count. Expected 25 pieces.' });
  }

  const isCorrect = solution_order.every((val, idx) => val === idx);
  if (!isCorrect) {
    return res.json({ success: true, correct: false, message: 'Puzzle is not yet complete.' });
  }

  // Fair scoring computation
  // Base reward: Round 1 = 100, Round 2 = 200
  // Coins reward: Round 1 = +50 coins, Round 2 = +25 coins
  const baseScore = round_number === 1 ? 100 : 200;
  const coinsEarned = round_number === 1 ? 50 : 25;

  const matchStart = gameState.match_start_time || gameState.round_1_start_at || now;
  const matchEnd = gameState.match_end_time || now + 600000;
  const solveTimeMs = Math.max(0, now - matchStart);
  const remainingSeconds = Math.max(0, Math.floor((matchEnd - now) / 1000));

  const timeBonus = Math.round(remainingSeconds * (round_number === 1 ? 0.5 : 1.0));
  const moves = Math.max(1, move_count || 1);
  const idealMoves = round_number === 1 ? 25 : 35;
  const moveBonus = Math.max(0, (idealMoves - moves) * 2);
  const awardedScore = baseScore + timeBonus + moveBonus;

  if (round_number === 1) {
    player.completed_round_1 = true;
    player.round_1_score = awardedScore;
    player.round_1_moves = moves;
    player.round_1_time_ms = solveTimeMs;
    player.coins = (player.coins || 0) + coinsEarned;
    player.total_score = player.round_1_score + player.round_2_score;
    player.status = 'ROUND_1_COMPLETE';
  } else {
    player.completed_round_2 = true;
    player.round_2_score = awardedScore;
    player.round_2_moves = moves;
    player.round_2_time_ms = solveTimeMs;
    player.coins = (player.coins || 0) + coinsEarned;
    player.total_score = player.round_1_score + player.round_2_score;
    player.status = 'COMPLETED';
    player.completed_at = now;
  }

  const responsePayload = {
    success: true,
    correct: true,
    round_number,
    awarded_score: awardedScore,
    coins_earned: coinsEarned,
    total_coins: player.coins,
    total_score: player.total_score,
    solve_time_ms: solveTimeMs,
    remaining_seconds: remainingSeconds,
    next_round: round_number === 1 ? 2 : null
  };

  if (request_id) {
    processedRequests.set(request_id, responsePayload);
  }

  broadcastPlayersList();
  broadcast('PLAYER_COMPLETED', {
    player_id: player.id,
    player_name: player.name,
    animal_id: player.animal_id,
    round_number,
    score: awardedScore,
    coins: coinsEarned
  });

  res.json(responsePayload);
});

// Leaderboard Endpoint (Sorted by Rounds completed -> Total Score DESC -> Time ASC)
app.get('/api/match/leaderboard', (req, res) => {
  const leaderboard = Array.from(players.values())
    .map(p => ({
      id: p.id,
      name: p.name,
      animal_id: p.animal_id,
      hat_id: p.hat_id || 'none',
      glasses_id: p.glasses_id || 'none',
      outfit_id: p.outfit_id || 'none',
      round_1_score: p.round_1_score || 0,
      round_2_score: p.round_2_score || 0,
      total_score: (p.round_1_score || 0) + (p.round_2_score || 0),
      coins: p.coins || 0,
      total_time_ms: (p.round_1_time_ms || 0) + (p.round_2_time_ms || 0),
      completed_round_1: p.completed_round_1 || false,
      completed_round_2: p.completed_round_2 || false,
      status: p.status
    }))
    .sort((a, b) => {
      // 1. Completion tier (Completed R2 > Completed R1 > None)
      const aTier = a.completed_round_2 ? 2 : (a.completed_round_1 ? 1 : 0);
      const bTier = b.completed_round_2 ? 2 : (b.completed_round_1 ? 1 : 0);
      if (bTier !== aTier) return bTier - aTier;

      // 2. Total score DESC
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;

      // 3. Time ASC
      if (a.total_time_ms !== b.total_time_ms) return a.total_time_ms - b.total_time_ms;

      return a.id.localeCompare(b.id);
    })
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  res.json({ success: true, leaderboard });
});

// ==========================================================
// ADMIN CONTROL ENDPOINTS
// ==========================================================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (!code || code !== ADMIN_CODE) {
    return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
  }
  const adminToken = `adm-${uuidv4()}`;
  adminSessions.add(adminToken);
  res.json({ success: true, admin_token: adminToken });
});

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.body?.admin_token;
  if (!token || !adminSessions.has(token)) {
    return res.status(403).json({ success: false, error: 'Unauthorized admin action.' });
  }
  next();
}

// 1. START MATCH: Authoritative start with 3-2-1 synchronized countdown
app.post('/api/admin/start-match', requireAdmin, (req, res) => {
  if (gameState.status !== 'WAITING' && gameState.status !== 'STOPPED') {
    return res.status(400).json({ success: false, error: `Match cannot be started from current status (${gameState.status}).` });
  }

  const now = Date.now();
  const matchDurationMs = (gameState.match_duration_seconds || 600) * 1000;

  gameState.status = 'ROUND_1';
  gameState.current_round = 1;
  gameState.match_start_time = now;
  gameState.match_end_time = now + matchDurationMs;
  gameState.round_1_start_at = now;
  gameState.round_1_end_at = now + (gameState.round_1_duration_seconds * 1000);
  gameState.is_paused = false;
  gameState.stop_reason = null;
  gameState.version++;

  for (const p of players.values()) {
    p.status = 'PLAYING';
  }

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_STARTED', { match_start_time: now, match_end_time: gameState.match_end_time });
  broadcast('TOAST', { message: 'Match started! Round 1 is live!' });

  res.json({ success: true, match_state: getPublicMatchState() });
});

// 2. STOP MATCH: Fixes previous issue - stops timer, stops moves, sets STOPPED, notifies players
app.post('/api/admin/stop-match', requireAdmin, (req, res) => {
  if (gameState.status === 'STOPPED') {
    return res.status(400).json({ success: false, error: 'Match is already stopped.' });
  }

  gameState.previous_status = gameState.status;
  gameState.status = 'STOPPED';
  gameState.stop_reason = 'The administrator has stopped this challenge.';
  gameState.version++;

  // Freeze players in STOPPED state unless already completed
  for (const p of players.values()) {
    if (p.status !== 'COMPLETED') {
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
  gameState.is_paused = true;
  gameState.paused_at = Date.now();
  gameState.version++;

  broadcastGameState();
  broadcast('MATCH_PAUSED', { paused_at: gameState.paused_at });
  broadcast('TOAST', { message: 'Match paused by administrator' });
  res.json({ success: true, is_paused: true, match_state: getPublicMatchState() });
});

// 4. RESUME MATCH
app.post('/api/admin/resume', requireAdmin, (req, res) => {
  if (!gameState.is_paused) {
    return res.status(400).json({ success: false, error: 'Match is not paused.' });
  }
  const pausedDuration = Date.now() - (gameState.paused_at || Date.now());
  gameState.is_paused = false;
  gameState.paused_at = null;
  gameState.total_paused_ms += pausedDuration;

  // Authoritatively extend match end time by paused duration
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

  broadcastGameState();
  broadcast('MATCH_RESUMED', { server_now: Date.now() });
  broadcast('TOAST', { message: 'Match resumed' });
  res.json({ success: true, is_paused: false, match_state: getPublicMatchState() });
});

// 5. RESET MATCH: Resets player progress, scores, coins, puzzle states, returns to WAITING
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
  gameState.is_paused = false;
  gameState.paused_at = null;
  gameState.stop_reason = null;
  gameState.version++;

  // Reset player progress without wiping registered names/mascots
  for (const p of players.values()) {
    p.status = 'WAITING';
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

  processedRequests.clear();

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_RESET', { message: 'Match progress has been reset by organizer.' });
  broadcast('TOAST', { message: 'Match reset to lobby' });

  res.json({ success: true, match_state: getPublicMatchState() });
});

// 6. END MATCH: Finalizes match
app.post('/api/admin/end-match', requireAdmin, (req, res) => {
  gameState.status = 'COMPLETED';
  gameState.version++;

  for (const p of players.values()) {
    if (p.status !== 'COMPLETED') {
      p.status = 'COMPLETED';
    }
  }

  broadcastGameState();
  broadcastPlayersList();
  broadcast('MATCH_COMPLETED', { message: 'Challenge has concluded!' });
  res.json({ success: true, match_state: getPublicMatchState() });
});

// Remove / Kick Player
app.post('/api/admin/remove-player', requireAdmin, (req, res) => {
  const { player_id } = req.body;
  for (const [token, p] of players.entries()) {
    if (p.id === player_id) {
      usernamesMap.delete(p.name.toLowerCase());
      players.delete(token);
      broadcastPlayersList();
      return res.json({ success: true });
    }
  }
  res.status(404).json({ success: false, error: 'Player not found.' });
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
  broadcastGameState();
  broadcastPlayersList();
  res.json({ success: true, state: getPublicMatchState() });
});

// Export Results CSV
app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
  const leaderboard = Array.from(players.values())
    .map(p => ({
      id: p.id,
      name: p.name,
      animal_id: p.animal_id,
      hat_id: p.hat_id || 'none',
      glasses_id: p.glasses_id || 'none',
      outfit_id: p.outfit_id || 'none',
      round_1_score: p.round_1_score || 0,
      round_2_score: p.round_2_score || 0,
      total_score: (p.round_1_score || 0) + (p.round_2_score || 0),
      coins: p.coins || 0,
      total_time_ms: (p.round_1_time_ms || 0) + (p.round_2_time_ms || 0),
      status: p.status
    }))
    .sort((a, b) => b.total_score - a.total_score);

  let csv = 'Rank,Player Name,Mascot,Hat,Glasses,Outfit,Round 1 Score,Round 2 Score,Total Score,Coins,Solve Time (s),Status\n';
  leaderboard.forEach((p, idx) => {
    const timeSec = (p.total_time_ms / 1000).toFixed(1);
    csv += `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.animal_id},${p.hat_id},${p.glasses_id},${p.outfit_id},${p.round_1_score},${p.round_2_score},${p.total_score},${p.coins},${timeSec},${p.status}\n`;
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

  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Engineering Day Puzzle Challenge Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
  console.log(`🔑 Admin initial access code: ${ADMIN_CODE}`);
});
