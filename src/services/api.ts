import { MatchState, Player, Avatar, LeaderboardEntry, HatId, GlassesId, OutfitId } from '../types/game';
import { supabase } from '../utils/supabase';

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
    // API offline, try Supabase
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
      if (data.state) return data.state;
    }
  } catch (err) {
    // fallback
  }

  return {
    match_id: 'match-eng-2026-01',
    event_title: 'ENGINEERING DAY',
    event_subtitle: 'PUZZLE CHALLENGE',
    match_code: 'ENGDAY26',
    status: 'WAITING',
    current_round: 1,
    max_players: 40,
    round_1_duration_seconds: 180,
    round_2_duration_seconds: 600,
    match_duration_seconds: 600,
    round_1_start_at: null,
    round_1_end_at: null,
    round_2_start_at: null,
    round_2_end_at: null,
    match_start_time: null,
    match_end_time: null,
    is_paused: false,
    paused_at: null,
    version: 1,
    server_now: Date.now(),
    current_puzzle: null
  };
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
    console.warn('Backend check-username unreachable, checking Supabase directly:', apiErr);
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
    console.warn('Supabase username check fallback error:', sbErr);
  }

  // Tier 3: Local format confirmation (never block user on network error)
  return { available: true, message: 'Username available' };
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
    const timeoutId = setTimeout(() => controller.abort(), 3000);
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
      if (res.ok && data.success) {
        return data;
      }
      if (data.error && !data.error.includes('Failed to fetch')) {
        throw new Error(data.error);
      }
    }
  } catch (apiErr: any) {
    if (apiErr?.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('abort')) {
      throw apiErr;
    }
    console.warn('Backend join API unavailable, initializing resilient player session:', apiErr);
  }

  // Tier 2: Resilient Local Session
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
    last_seen_at: Date.now()
  };

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
  const res = await fetch(`${API_BASE}/player/session/${token}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Session expired.');
  }
  return data;
}

export async function sendHeartbeat(sessionToken: string): Promise<void> {
  await fetch(`${API_BASE}/player/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken })
  });
}

export async function advanceRound2(sessionToken: string): Promise<{ player: Player }> {
  const res = await fetch(`${API_BASE}/player/advance-round-2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to advance round.');
  }
  return data;
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
  const res = await fetch(`${API_BASE}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/match/leaderboard`);
  const data = await res.json();
  return data.leaderboard || [];
}

// Admin APIs
export async function adminLogin(code: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid admin credentials.');
  }
  return data.admin_token;
}

export async function adminStartMatch(token: string): Promise<MatchState> {
  const res = await fetch(`${API_BASE}/admin/start-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to start match.');
  }
  return data.match_state;
}

export async function adminStopMatch(token: string): Promise<MatchState> {
  const res = await fetch(`${API_BASE}/admin/stop-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to stop match.');
  }
  return data.match_state;
}

export async function adminPause(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to pause match.');
  }
}

export async function adminResume(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to resume match.');
  }
}

export async function adminResetMatch(token: string): Promise<MatchState> {
  const res = await fetch(`${API_BASE}/admin/reset-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset match.');
  }
  return data.match_state;
}

export async function adminEndMatch(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/end-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to end match.');
  }
}

export async function adminRemovePlayer(token: string, playerId: string): Promise<void> {
  await fetch(`${API_BASE}/admin/remove-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId })
  });
}

export async function adminClearAllPlayers(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/clear-all-players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to clear players.');
  }
}

export async function updateAvatar(
  sessionToken: string,
  config: { animal_id?: string; hat_id?: HatId | string; glasses_id?: GlassesId | string; outfit_id?: OutfitId | string }
): Promise<{ player: Player }> {
  const res = await fetch(`${API_BASE}/player/update-avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken, ...config })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update avatar.');
  }
  return data;
}

export async function fetchAdminPlayers(token: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/admin/players`, {
    headers: { 'x-admin-token': token }
  });
  const data = await res.json();
  return data.players || [];
}

