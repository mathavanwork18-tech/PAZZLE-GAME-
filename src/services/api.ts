import { MatchState, Player, Avatar, LeaderboardEntry, HatId, GlassesId, OutfitId, CoinTransaction, AuditLogEntry } from '../types/game';
import { trackPlayerPresence, getDefaultMatchState, saveCachedMatchState } from './realtime';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

/**
 * Robust JSON fetcher that guards against HTML <!DOCTYPE fallback responses
 * and automatically retries against direct backend port in development.
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    // If relative /api failed in local dev on port 5173, fallback directly to port 3001 using client hostname
    if (typeof window !== 'undefined' && window.location.port === '5173' && url.startsWith('/api')) {
      const host = window.location.hostname || '127.0.0.1';
      try {
        res = await fetch(`http://${host}:3001${url}`, options);
      } catch (e) {
        throw new Error('Cannot connect to backend server. Please verify server is running on port 3001.');
      }
    } else {
      throw new Error(netErr.message || 'Network connection failed.');
    }
  }

  const text = await res.text();

  // If server/proxy returned an HTML document (<!DOCTYPE html>...), handle gracefully
  if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
    if (typeof window !== 'undefined' && window.location.port === '5173' && url.startsWith('/api')) {
      const host = window.location.hostname || '127.0.0.1';
      try {
        const directRes = await fetch(`http://${host}:3001${url}`, options);
        const directText = await directRes.text();
        if (!directText.trim().startsWith('<')) {
          const directData = JSON.parse(directText);
          if (!directRes.ok || directData.success === false) {
            throw new Error(directData.error || `Server error (${directRes.status})`);
          }
          return directData as T;
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('Unexpected token')) throw e;
      }
    }
    throw new Error(
      res.ok
        ? 'Server returned HTML instead of JSON. Backend service may be starting up.'
        : `Server error (${res.status}): Please check backend service.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }

  return data as T;
}

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
    const data = await safeFetchJson(`${API_BASE}/avatars`);
    if (data.avatars && data.avatars.length > 0) {
      return data.avatars;
    }
  } catch (err) {
    // fallback to defaults
  }
  return DEFAULT_AVATARS;
}

export async function fetchMatchState(): Promise<MatchState> {
  try {
    const data = await safeFetchJson(`${API_BASE}/match/state`);
    if (data.state) {
      saveCachedMatchState(data.state);
      return data.state;
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

  try {
    const data = await safeFetchJson(`${API_BASE}/player/check-username?name=${encodeURIComponent(clean)}`);
    return data;
  } catch (apiErr) {
    // fallback
  }

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
  is_late_joiner?: boolean;
}> {
  const cleanName = (name || '').trim();
  const safeAnimal = animalId || 'panda';
  const safeHat = (hatId as HatId) || 'none';
  const safeGlasses = (glassesId as GlassesId) || 'none';
  const safeOutfit = (outfitId as OutfitId) || 'none';

  const data = await safeFetchJson(`${API_BASE}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: cleanName,
      animal_id: safeAnimal,
      hat_id: safeHat,
      glasses_id: safeGlasses,
      outfit_id: safeOutfit,
      session_token: sessionToken
    })
  });

  if (!data.success || !data.player) {
    throw new Error(data.error || 'Failed to join challenge.');
  }

  trackPlayerPresence(data.player);
  localStorage.setItem('eng_player_data', JSON.stringify(data.player));
  return data;
}

export async function restoreSession(token: string): Promise<{
  player: Player;
  match_state: MatchState;
}> {
  const data = await safeFetchJson(`${API_BASE}/player/session/${token}`);
  if (!data.success || !data.player) {
    throw new Error(data.error || 'Session not found or expired.');
  }

  trackPlayerPresence(data.player);
  localStorage.setItem('eng_player_data', JSON.stringify(data.player));
  return data;
}

export async function sendHeartbeat(sessionToken: string): Promise<void> {
  try {
    await safeFetchJson(`${API_BASE}/player/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken })
    });
  } catch (e) {
    // ignore
  }
}

export async function advanceRound2(sessionToken: string): Promise<{ player: Player }> {
  const data = await safeFetchJson(`${API_BASE}/player/advance-round-2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken })
  });

  if (!data.success || !data.player) {
    throw new Error(data.error || 'Failed to advance to Round 2.');
  }

  trackPlayerPresence(data.player);
  localStorage.setItem('eng_player_data', JSON.stringify(data.player));
  return data;
}

export async function submitPuzzle(payload: {
  session_token: string;
  round_number: number;
  solution_order: number[];
  move_count: number;
  request_id: string;
}): Promise<{
  success: boolean;
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
  const data = await safeFetchJson(`${API_BASE}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!data.success && !data.correct) {
    throw new Error(data.error || 'Submission rejected by server.');
  }

  if (data.success && data.correct) {
    const cachedStr = localStorage.getItem('eng_player_data');
    if (cachedStr) {
      try {
        const p = JSON.parse(cachedStr);
        p.total_score = data.total_score;
        p.coins = data.total_coins;
        if (payload.round_number === 1) p.completed_round_1 = true;
        else p.completed_round_2 = true;
        localStorage.setItem('eng_player_data', JSON.stringify(p));
        trackPlayerPresence(p);
      } catch (e) {
        // ignore
      }
    }
  }

  return data;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const data = await safeFetchJson(`${API_BASE}/match/leaderboard`);
    if (data.leaderboard && Array.isArray(data.leaderboard)) {
      return data.leaderboard.map((p: any, idx: number) => ({
        ...p,
        rank: idx + 1
      }));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

// Admin APIs
export async function adminLogin(code: string): Promise<string> {
  const data = await safeFetchJson(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  if (!data.success || !data.admin_token) {
    throw new Error(data.error || 'Invalid admin credentials.');
  }
  return data.admin_token;
}

export async function verifyEmergencyCode(token: string, code: string): Promise<boolean> {
  const data = await safeFetchJson(`${API_BASE}/admin/verify-emergency-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ code })
  });

  if (!data.success) {
    throw new Error(data.error || 'Invalid emergency code.');
  }
  return true;
}

export async function adminStartMatch(token: string): Promise<MatchState> {
  const data = await safeFetchJson(`${API_BASE}/admin/start-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to start match.');
  }
  return data.match_state;
}

export async function adminStopMatch(token: string): Promise<MatchState> {
  const data = await safeFetchJson(`${API_BASE}/admin/stop-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to stop match.');
  }
  return data.match_state;
}

export async function adminPause(token: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to pause match.');
  }
}

export async function adminResume(token: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to resume match.');
  }
}

export async function adminResetMatch(token: string): Promise<MatchState> {
  const data = await safeFetchJson(`${API_BASE}/admin/reset-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to reset match.');
  }
  return data.match_state;
}

export async function adminEndMatch(token: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/end-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to end match.');
  }
}

export async function adminAdmitPlayer(token: string, playerId: string): Promise<Player> {
  const data = await safeFetchJson(`${API_BASE}/admin/admit-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId })
  });

  if (!data.success || !data.player) {
    throw new Error(data.error || 'Failed to admit player.');
  }
  return data.player;
}

export async function adminKickPlayer(token: string, playerId: string, reason?: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/kick-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId, reason })
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to kick player.');
  }
}

export async function adminRemovePlayer(token: string, playerId: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/remove-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId })
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to remove player.');
  }
}

export async function adminClearAllPlayers(token: string): Promise<void> {
  const data = await safeFetchJson(`${API_BASE}/admin/clear-all-players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token }
  });

  if (!data.success) {
    throw new Error(data.error || 'Failed to clear players.');
  }
  localStorage.removeItem('eng_player_token');
  localStorage.removeItem('eng_player_data');
}

export async function fetchAdminPlayers(token: string): Promise<Player[]> {
  try {
    const data = await safeFetchJson(`${API_BASE}/admin/players`, {
      headers: { 'x-admin-token': token }
    });
    return data.players || [];
  } catch (e) {
    return [];
  }
}

export async function fetchLateJoiners(token: string): Promise<Player[]> {
  try {
    const data = await safeFetchJson(`${API_BASE}/admin/late-joiners`, {
      headers: { 'x-admin-token': token }
    });
    return data.late_joiners || [];
  } catch (e) {
    return [];
  }
}

export async function fetchKickedPlayers(token: string): Promise<Player[]> {
  try {
    const data = await safeFetchJson(`${API_BASE}/admin/kicked-players`, {
      headers: { 'x-admin-token': token }
    });
    return data.kicked_players || [];
  } catch (e) {
    return [];
  }
}

export async function fetchCoinTransactions(token: string, playerId?: string): Promise<CoinTransaction[]> {
  try {
    const url = playerId ? `${API_BASE}/admin/coin-transactions?player_id=${encodeURIComponent(playerId)}` : `${API_BASE}/admin/coin-transactions`;
    const data = await safeFetchJson(url, {
      headers: { 'x-admin-token': token }
    });
    return data.transactions || [];
  } catch (e) {
    return [];
  }
}

export async function fetchAuditLogs(token: string): Promise<AuditLogEntry[]> {
  try {
    const data = await safeFetchJson(`${API_BASE}/admin/audit-logs`, {
      headers: { 'x-admin-token': token }
    });
    return data.logs || [];
  } catch (e) {
    return [];
  }
}

export async function updateAvatar(
  sessionToken: string,
  config: { animal_id?: string; hat_id?: HatId | string; glasses_id?: GlassesId | string; outfit_id?: OutfitId | string }
): Promise<{ player: Player }> {
  const data = await safeFetchJson(`${API_BASE}/player/update-avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken, ...config })
  });

  if (!data.success || !data.player) {
    throw new Error(data.error || 'Failed to update avatar.');
  }
  trackPlayerPresence(data.player);
  return data;
}

export async function logoutPlayer(player?: Player | null): Promise<void> {
  localStorage.removeItem('eng_player_token');
  localStorage.removeItem('eng_player_data');
}
