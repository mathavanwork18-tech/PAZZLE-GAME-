import { MatchState, Player, Avatar, LeaderboardEntry, HatId, GlassesId, OutfitId, CoinTransaction, AuditLogEntry } from '../types/game';
import { trackPlayerPresence, getDefaultMatchState, saveCachedMatchState } from './realtime';

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
    const res = await fetch(`${API_BASE}/avatars`);
    if (res.ok) {
      const data = await res.json();
      if (data.avatars && data.avatars.length > 0) {
        return data.avatars;
      }
    }
  } catch (err) {
    // fallback
  }
  return DEFAULT_AVATARS;
}

export async function fetchMatchState(): Promise<MatchState> {
  try {
    const res = await fetch(`${API_BASE}/match/state`);
    if (res.ok) {
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

  try {
    const res = await fetch(`${API_BASE}/player/check-username?name=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
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

  const res = await fetch(`${API_BASE}/player/join`, {
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

  const data = await res.json();
  if (!res.ok || !data.success || !data.player) {
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
  const res = await fetch(`${API_BASE}/player/session/${token}`);
  if (!res.ok) {
    throw new Error('Session not found or expired.');
  }
  const data = await res.json();
  if (!data.success || !data.player) {
    throw new Error('Invalid session response.');
  }

  trackPlayerPresence(data.player);
  localStorage.setItem('eng_player_data', JSON.stringify(data.player));
  return data;
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
  const res = await fetch(`${API_BASE}/player/advance-round-2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.player) {
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
  const res = await fetch(`${API_BASE}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok && !data.correct) {
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
  const res = await fetch(`${API_BASE}/match/leaderboard`);
  if (res.ok) {
    const data = await res.json();
    if (data.leaderboard && Array.isArray(data.leaderboard)) {
      return data.leaderboard.map((p: any, idx: number) => ({
        ...p,
        rank: idx + 1
      }));
    }
  }
  return [];
}

// Admin APIs
export async function adminLogin(code: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.admin_token) {
    throw new Error(data.error || 'Invalid admin credentials.');
  }
  return data.admin_token;
}

export async function verifyEmergencyCode(token: string, code: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/verify-emergency-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid emergency code.');
  }
  return true;
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

export async function adminAdmitPlayer(token: string, playerId: string): Promise<Player> {
  const res = await fetch(`${API_BASE}/admin/admit-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.player) {
    throw new Error(data.error || 'Failed to admit player.');
  }
  return data.player;
}

export async function adminKickPlayer(token: string, playerId: string, reason?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/kick-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId, reason })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to kick player.');
  }
}

export async function adminRemovePlayer(token: string, playerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/remove-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ player_id: playerId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to remove player.');
  }
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
  localStorage.removeItem('eng_player_token');
  localStorage.removeItem('eng_player_data');
}

export async function fetchAdminPlayers(token: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/admin/players`, {
    headers: { 'x-admin-token': token }
  });
  if (res.ok) {
    const data = await res.json();
    return data.players || [];
  }
  return [];
}

export async function fetchLateJoiners(token: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/admin/late-joiners`, {
    headers: { 'x-admin-token': token }
  });
  if (res.ok) {
    const data = await res.json();
    return data.late_joiners || [];
  }
  return [];
}

export async function fetchKickedPlayers(token: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/admin/kicked-players`, {
    headers: { 'x-admin-token': token }
  });
  if (res.ok) {
    const data = await res.json();
    return data.kicked_players || [];
  }
  return [];
}

export async function fetchCoinTransactions(token: string, playerId?: string): Promise<CoinTransaction[]> {
  const url = playerId ? `${API_BASE}/admin/coin-transactions?player_id=${encodeURIComponent(playerId)}` : `${API_BASE}/admin/coin-transactions`;
  const res = await fetch(url, {
    headers: { 'x-admin-token': token }
  });
  if (res.ok) {
    const data = await res.json();
    return data.transactions || [];
  }
  return [];
}

export async function fetchAuditLogs(token: string): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { 'x-admin-token': token }
  });
  if (res.ok) {
    const data = await res.json();
    return data.logs || [];
  }
  return [];
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
  if (!res.ok || !data.success || !data.player) {
    throw new Error(data.error || 'Failed to update avatar.');
  }
  trackPlayerPresence(data.player);
  return data;
}

export async function logoutPlayer(player?: Player | null): Promise<void> {
  localStorage.removeItem('eng_player_token');
  localStorage.removeItem('eng_player_data');
}
