import { MatchState, Player, Avatar, LeaderboardEntry, HatId, GlassesId, OutfitId } from '../types/game';
import { supabase } from '../utils/supabase';
import {
  trackPlayerPresence,
  untrackPlayerPresence,
  broadcastMatchState,
  broadcastStartMatch,
  broadcastStopMatch,
  broadcastResetMatch,
  broadcastKickPlayer,
  getDefaultMatchState,
  saveCachedMatchState
} from './realtime';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

export const DEFAULT_AVATARS: Avatar[] = [
  { id: 'fox', name: 'Fox', image_url: '/avatars/fox.png', accent_color: '#F97316' },
  { id: 'panda', name: 'Panda', image_url: '/avatars/panda.png', accent_color: '#10B981' },
  { id: 'tiger', name: 'Tiger', image_url: '/avatars/tiger.png', accent_color: '#EAB308' },
  { id: 'lion', name: 'Lion', image_url: '/avatars/lion.png', accent_color: '#EF4444' },
  { id: 'koala', name: 'Koala', image_url: '/avatars/koala.png', accent_color: '#A855F7' },
  { id: 'penguin', name: 'Penguin', image_url: '/avatars/penguin.png', accent_color: '#38BDF8' },
  { id: 'rabbit', name: 'Rabbit', image_url: '/avatars/rabbit.png', accent_color: '#EC4899' },
  { id: 'bear', name: 'Bear', image_url: '/avatars/bear.png', accent_color: '#3B82F6' },
  { id: 'monkey', name: 'Monkey', image_url: '/avatars/monkey.png', accent_color: '#84CC16' },
  { id: 'frog', name: 'Frog', image_url: '/avatars/frog.png', accent_color: '#14B8A6' },
  { id: 'raccoon', name: 'Raccoon', image_url: '/avatars/raccoon.png', accent_color: '#8B5CF6' },
  { id: 'elephant', name: 'Elephant', image_url: '/avatars/elephant.png', accent_color: '#60A5FA' },
  { id: 'giraffe', name: 'Giraffe', image_url: '/avatars/giraffe.png', accent_color: '#06B6D4' },
  { id: 'zebra', name: 'Zebra', image_url: '/avatars/zebra.png', accent_color: '#9333EA' },
  { id: 'cat', name: 'Cat', image_url: '/avatars/cat.png', accent_color: '#F43F5E' },
  { id: 'dog', name: 'Dog', image_url: '/avatars/dog.png', accent_color: '#2563EB' }
];

// Helper to generate non-trivial shuffled permutation for 25-piece grid
export function generateShuffledArray(size = 25): number[] {
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

export async function fetchAvatars(): Promise<Avatar[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/avatars`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.avatars && data.avatars.length > 0) {
        return data.avatars;
      }
    }
  } catch (err) {
    // API offline, fallback
  }

  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (!error && data && data.length > 0) {
      return data as Avatar[];
    }
  } catch (sbErr) {
    // Supabase fallback
  }

  return DEFAULT_AVATARS;
}

export async function fetchMatchState(): Promise<MatchState> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/match/state`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.state) {
        saveCachedMatchState(data.state);
        return data.state;
      }
    }
  } catch (err) {
    // fallback
  }

  return getDefaultMatchState();
}

export async function checkUsernameAvailability(name: string): Promise<{
  available: boolean;
  message: string;
}> {
  const clean = (name || '').trim();
  if (clean.length < 3) {
    return { available: false, message: 'Username must be at least 3 characters.' };
  }
  if (clean.length > 20) {
    return { available: false, message: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(clean)) {
    return { available: false, message: 'Username can only contain letters, numbers, and spaces.' };
  }

  // Tier 1: Try Express API endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/player/check-username?name=${encodeURIComponent(clean)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (typeof data.available === 'boolean') {
        return data;
      }
    }
  } catch (apiErr) {
    // Backend offline, fallback to Supabase
  }

  // Tier 2: Check Supabase directly
  try {
    const { data: existing, error } = await supabase
      .from('players')
      .select('id')
      .ilike('name', clean)
      .limit(1);

    if (!error) {
      if (existing && existing.length > 0) {
        return { available: false, message: 'Username is already taken. Try a new name.' };
      }
      return { available: true, message: 'Username available' };
    }
  } catch (sbErr) {
    // fallback
  }

  // Tier 3: Local format confirmation (never block user on network error)
  return { available: true, message: 'Username available' };
}

export async function savePlayerNameToSupabase(name: string): Promise<void> {
  const clean = (name || '').trim();
  if (!clean) return;

  try {
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .ilike('name', clean)
      .maybeSingle();

    if (existing && existing.id) {
      await supabase
        .from('players')
        .update({
          last_seen_at: new Date().toISOString(),
          connection_status: 'connected'
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('players')
        .insert({
          name: clean,
          player_code: `ENG-${Math.floor(1000 + Math.random() * 9000)}`,
          animal_id: 'fox',
          hat_id: 'none',
          status: 'WAITING',
          connection_status: 'connected',
          session_token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          session_token_hash: '',
          last_seen_at: new Date().toISOString()
        });
    }
    console.log(`[Supabase] Player name "${clean}" saved directly to database.`);
  } catch (err) {
    console.warn('[Supabase] Direct name storage notice:', err);
  }
}

export async function savePlayerToSupabase(player: Player): Promise<void> {
  try {
    const row: any = {
      name: player.name,
      player_code: player.player_id,
      animal_id: player.animal_id || 'fox',
      hat_id: player.hat_id || 'none',
      glasses_id: player.glasses_id || 'none',
      outfit_id: player.outfit_id || 'none',
      total_score: player.total_score || 0,
      coins: player.coins || 0,
      round_1_score: player.round_1_score || 0,
      round_2_score: player.round_2_score || 0,
      round_1_moves: player.round_1_moves || 0,
      round_2_moves: player.round_2_moves || 0,
      completed_round_1: Boolean(player.completed_round_1),
      completed_round_2: Boolean(player.completed_round_2),
      status: player.status || 'WAITING',
      connection_status: player.connection_status || 'connected',
      session_token: player.session_token,
      session_token_hash: player.session_token || '',
      last_seen_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .ilike('name', player.name)
      .maybeSingle();

    if (existing && existing.id) {
      await supabase
        .from('players')
        .update(row)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('players')
        .insert(row);
    }
    console.log(`[Supabase] Player "${player.name}" fully saved to database.`);
  } catch (err) {
    console.warn('[Supabase] Player record save notice:', err);
  }
}

export async function joinPlayer(
  name: string,
  animalId: string,
  hatId?: HatId | string,
  glassesId?: GlassesId | string,
  outfitId?: OutfitId | string,
  sessionToken?: string
): Promise<{
  player: Player;
  session_token: string;
  match_state: MatchState;
}> {
  const cleanName = (name || '').trim();
  const safeAnimal = animalId || 'fox';
  const safeHat = (hatId as HatId) || 'none';

  // Tier 1: Try Express API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/player/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        animal_id: safeAnimal,
        hat_id: safeHat,
        glasses_id: 'none',
        outfit_id: 'none',
        session_token: sessionToken
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.success && data.player) {
        // Track in Supabase Realtime & DB
        trackPlayerPresence(data.player);
        savePlayerToSupabase(data.player);
        localStorage.setItem('eng_player_data', JSON.stringify(data.player));
        return data;
      }
      if (data.error) {
        // If match was concluded, do not abort; let player join the fresh lobby
        if (data.error.toLowerCase().includes('concluded')) {
          console.warn('Backend match concluded; allowing lobby join.');
        } else {
          throw new Error(data.error);
        }
      }
    }
  } catch (apiErr: any) {
    if (apiErr?.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('abort') && !apiErr.message.toLowerCase().includes('concluded')) {
      throw apiErr;
    }
  }

  // Tier 2: Resilient Cloud Session (Direct Supabase Database Storage + Realtime Sync)
  const token = sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const pId = `ENG-${Math.floor(1000 + Math.random() * 9000)}`;
  const fallbackPlayer: Player = {
    id: pId,
    player_id: pId,
    name: cleanName,
    animal_id: safeAnimal,
    hat_id: safeHat,
    glasses_id: 'none',
    outfit_id: 'none',
    total_score: 0,
    coins: 0,
    round_1_score: 0,
    round_2_score: 0,
    completed_round_1: false,
    completed_round_2: false,
    status: 'WAITING',
    connection_status: 'connected',
    session_token: token,
    joined_at: Date.now(),
    last_seen_at: Date.now(),
    shuffled_puzzle_r1: generateShuffledArray(25),
    shuffled_puzzle_r2: generateShuffledArray(25)
  };

  localStorage.setItem('eng_player_data', JSON.stringify(fallbackPlayer));
  trackPlayerPresence(fallbackPlayer);
  await savePlayerToSupabase(fallbackPlayer);

  const state = await fetchMatchState();
  return {
    player: fallbackPlayer,
    session_token: token,
    match_state: state
  };
}

export async function restoreSession(token: string): Promise<{
  player: Player;
  match_state: MatchState;
}> {
  try {
    const res = await fetch(`${API_BASE}/player/session/${token}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.player) {
        trackPlayerPresence(data.player);
        savePlayerToSupabase(data.player);
        localStorage.setItem('eng_player_data', JSON.stringify(data.player));
        return data;
      }
    }
  } catch (e) {
    // fallback
  }

  // Direct Supabase lookup
  try {
    const { data: sbPlayer, error } = await supabase
      .from('players')
      .select('*')
      .or(`session_token.eq.${token},session_token_hash.eq.${token}`)
      .maybeSingle();

    if (!error && sbPlayer) {
      const restoredPlayer: Player = {
        id: sbPlayer.player_code || sbPlayer.id,
        player_id: sbPlayer.player_code || sbPlayer.id,
        name: sbPlayer.name,
        animal_id: sbPlayer.animal_id || 'fox',
        hat_id: sbPlayer.hat_id || 'none',
        glasses_id: 'none',
        outfit_id: 'none',
        total_score: sbPlayer.total_score || 0,
        coins: sbPlayer.coins || 0,
        round_1_score: sbPlayer.round_1_score || 0,
        round_2_score: sbPlayer.round_2_score || 0,
        completed_round_1: Boolean(sbPlayer.completed_round_1),
        completed_round_2: Boolean(sbPlayer.completed_round_2),
        status: sbPlayer.status || 'WAITING',
        connection_status: 'connected',
        session_token: token,
        joined_at: new Date(sbPlayer.joined_at).getTime() || Date.now(),
        last_seen_at: Date.now()
      };
      localStorage.setItem('eng_player_data', JSON.stringify(restoredPlayer));
      trackPlayerPresence(restoredPlayer);
      return {
        player: restoredPlayer,
        match_state: await fetchMatchState()
      };
    }
  } catch (sbErr) {
    // fallback to local storage
  }

  const cachedStr = localStorage.getItem('eng_player_data');
  if (cachedStr) {
    try {
      const p = JSON.parse(cachedStr);
      if (p && (p.session_token === token || !token)) {
        trackPlayerPresence(p);
        return {
          player: p,
          match_state: await fetchMatchState()
        };
      }
    } catch (e) {
      // ignore
    }
  }

  throw new Error('Session expired.');
}

export async function sendHeartbeat(sessionToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/player/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken })
    });
  } catch (e) {
    // ignore
  }
}

export async function advanceRound2(sessionToken: string): Promise<{ player: Player }> {
  try {
    const res = await fetch(`${API_BASE}/player/advance-round-2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken })
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.player) {
        trackPlayerPresence(data.player);
        localStorage.setItem('eng_player_data', JSON.stringify(data.player));
        return data;
      }
    }
  } catch (e) {
    // fallback
  }

  const cachedStr = localStorage.getItem('eng_player_data');
  if (cachedStr) {
    const p = JSON.parse(cachedStr);
    p.current_round = 2;
    p.status = 'ROUND_2_PLAYING';
    localStorage.setItem('eng_player_data', JSON.stringify(p));
    trackPlayerPresence(p);
    return { player: p };
  }

  throw new Error('Failed to advance round.');
}

export async function submitPuzzle(payload: {
  session_token: string;
  round_number: number;
  solution_order: number[];
  move_count: number;
  request_id: string;
}): Promise<{
  success?: boolean;
  correct: boolean;
  round_number?: number;
  awarded_score?: number;
  coins_earned?: number;
  total_coins?: number;
  total_score?: number;
  solve_time_ms?: number;
  remaining_seconds?: number;
  next_round?: number | null;
  error?: string;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/puzzle/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.correct) {
        // Update presence
        const cachedStr = localStorage.getItem('eng_player_data');
        if (cachedStr) {
          const p = JSON.parse(cachedStr);
          p.total_score = data.total_score;
          p.coins = data.total_coins;
          if (payload.round_number === 1) p.completed_round_1 = true;
          else p.completed_round_2 = true;
          localStorage.setItem('eng_player_data', JSON.stringify(p));
          trackPlayerPresence(p);
        }
      }
      return data;
    }
  } catch (e) {
    // Netlify fallback
  }

  // Authoritative validation of 25-piece canonical puzzle order (0..24)
  const isCorrect = payload.solution_order.every((val, idx) => val === idx);
  if (!isCorrect) {
    return { success: true, correct: false, message: 'Puzzle is not yet complete.' };
  }

  const baseScore = payload.round_number === 1 ? 100 : 200;
  const coinsEarned = payload.round_number === 1 ? 50 : 25;
  const idealMoves = payload.round_number === 1 ? 25 : 35;
  const moveBonus = Math.max(0, (idealMoves - payload.move_count) * 2);
  const awardedScore = baseScore + moveBonus;

  const cachedStr = localStorage.getItem('eng_player_data');
  let finalPlayer: any = null;
  if (cachedStr) {
    try {
      const p = JSON.parse(cachedStr);
      if (payload.round_number === 1) {
        p.completed_round_1 = true;
        p.round_1_score = awardedScore;
        p.round_1_moves = payload.move_count;
        p.current_round = 2;
        p.status = 'ROUND_1_COMPLETE';
      } else {
        p.completed_round_2 = true;
        p.round_2_score = awardedScore;
        p.round_2_moves = payload.move_count;
        p.status = 'COMPLETED';
      }
      p.total_score = (p.total_score || 0) + awardedScore;
      p.coins = (p.coins || 0) + coinsEarned;
      finalPlayer = p;
      localStorage.setItem('eng_player_data', JSON.stringify(p));
      trackPlayerPresence(p);
      savePlayerToSupabase(p);
    } catch (err) {
      // ignore
    }
  }

  return {
    success: true,
    correct: true,
    round_number: payload.round_number,
    awarded_score: awardedScore,
    coins_earned: coinsEarned,
    total_coins: finalPlayer ? finalPlayer.coins : coinsEarned,
    total_score: finalPlayer ? finalPlayer.total_score : awardedScore,
    next_round: payload.round_number === 1 ? 2 : null
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/match/leaderboard`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.leaderboard && data.leaderboard.length > 0) {
        return data.leaderboard;
      }
    }
  } catch (e) {
    // fallback
  }

  // Direct Supabase query for real-time live leaderboard
  try {
    const { data: sbPlayers, error } = await supabase
      .from('players')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(40);

    if (!error && sbPlayers && sbPlayers.length > 0) {
      return sbPlayers.map((sp: any, idx: number) => ({
        id: sp.player_code || sp.id,
        name: sp.name,
        animal_id: sp.animal_id || 'fox',
        hat_id: sp.hat_id || 'none',
        glasses_id: 'none',
        outfit_id: 'none',
        round_1_score: Number(sp.round_1_score) || 0,
        round_2_score: Number(sp.round_2_score) || 0,
        total_score: Number(sp.total_score) || 0,
        coins: Number(sp.coins) || 0,
        total_time_ms: Number(sp.round_1_time_ms || 0) + Number(sp.round_2_time_ms || 0),
        completed_round_1: Boolean(sp.completed_round_1),
        completed_round_2: Boolean(sp.completed_round_2),
        status: sp.status || 'WAITING',
        rank: idx + 1
      }));
    }
  } catch (e) {
    // fallback
  }

  return [];
}

// Admin APIs
export async function adminLogin(code: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.admin_token) {
        return data.admin_token;
      }
    }
  } catch (e) {
    // Netlify fallback
  }

  if (code.trim() === 'admin@123') {
    return 'eng_admin_token_2026';
  }
  throw new Error('Invalid admin credentials.');
}

export async function adminStartMatch(token: string): Promise<MatchState> {
  try {
    const res = await fetch(`${API_BASE}/admin/start-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.match_state) {
        broadcastMatchState(data.match_state);
        broadcastStartMatch();
        return data.match_state;
      }
    }
  } catch (e) {
    // Netlify fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...current,
    status: 'ROUND_1',
    current_round: 1,
    round_1_start_at: Date.now(),
    round_1_end_at: Date.now() + 180000,
    match_start_time: Date.now(),
    match_end_time: Date.now() + 600000,
    is_paused: false,
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
  await broadcastStartMatch();
  return nextState;
}

export async function adminStopMatch(token: string): Promise<MatchState> {
  try {
    const res = await fetch(`${API_BASE}/admin/stop-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.match_state) {
        broadcastMatchState(data.match_state);
        broadcastStopMatch();
        return data.match_state;
      }
    }
  } catch (e) {
    // Netlify fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...current,
    status: 'STOPPED',
    is_paused: false,
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
  await broadcastStopMatch();
  return nextState;
}

export async function adminPause(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
  } catch (e) {
    // fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...current,
    is_paused: true,
    paused_at: Date.now(),
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
}

export async function adminResume(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
  } catch (e) {
    // fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...current,
    is_paused: false,
    paused_at: null,
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
}

export async function adminResetMatch(token: string): Promise<MatchState> {
  try {
    const res = await fetch(`${API_BASE}/admin/reset-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.match_state) {
        broadcastMatchState(data.match_state);
        broadcastResetMatch();
        return data.match_state;
      }
    }
  } catch (e) {
    // fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...getDefaultMatchState(),
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
  await broadcastResetMatch();
  return nextState;
}

export async function adminEndMatch(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/end-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
  } catch (e) {
    // fallback
  }

  const current = await fetchMatchState();
  const nextState: MatchState = {
    ...current,
    status: 'COMPLETED',
    version: current.version + 1
  };
  await broadcastMatchState(nextState);
}

export async function adminRemovePlayer(token: string, playerId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/remove-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ player_id: playerId })
    });
  } catch (e) {
    // fallback
  }

  await broadcastKickPlayer(playerId);
}

export async function adminClearAllPlayers(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/clear-all-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
    });
  } catch (e) {
    // fallback
  }

  localStorage.removeItem('eng_player_token');
  localStorage.removeItem('eng_player_data');
  await broadcastResetMatch();
}

export async function updateAvatar(
  sessionToken: string,
  config: { animal_id?: string; hat_id?: HatId | string; glasses_id?: GlassesId | string; outfit_id?: OutfitId | string }
): Promise<{ player: Player }> {
  try {
    const res = await fetch(`${API_BASE}/player/update-avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken, ...config })
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.player) {
        trackPlayerPresence(data.player);
        return data;
      }
    }
  } catch (e) {
    // fallback
  }

  const cachedStr = localStorage.getItem('eng_player_data');
  if (cachedStr) {
    const p = JSON.parse(cachedStr);
    if (config.animal_id) p.animal_id = config.animal_id;
    if (config.hat_id) p.hat_id = config.hat_id;
    localStorage.setItem('eng_player_data', JSON.stringify(p));
    trackPlayerPresence(p);
    return { player: p };
  }

  throw new Error('Failed to update avatar.');
}

export async function fetchAdminPlayers(token: string): Promise<Player[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/players`, {
      headers: { 'x-admin-token': token }
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      return data.players || [];
    }
  } catch (e) {
    // fallback
  }

  return [];
}

export async function logoutPlayer(player?: Player | null): Promise<void> {
  try {
    if (player) {
      await untrackPlayerPresence();
      if (player.name) {
        await supabase
          .from('players')
          .update({ connection_status: 'disconnected', last_seen_at: new Date().toISOString() })
          .ilike('name', player.name);
      }
    }
  } catch (err) {
    console.warn('[Logout] Notice during player logout:', err);
  } finally {
    localStorage.removeItem('eng_player_token');
    localStorage.removeItem('eng_player_data');
  }
}
