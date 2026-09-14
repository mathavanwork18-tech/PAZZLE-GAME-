import { MatchState, Player, Avatar, LeaderboardEntry, HatId, GlassesId, OutfitId } from '../types/game';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

export async function fetchAvatars(): Promise<Avatar[]> {
  const res = await fetch(`${API_BASE}/avatars`);
  const data = await res.json();
  return data.avatars || [];
}

export async function fetchMatchState(): Promise<MatchState> {
  const res = await fetch(`${API_BASE}/match/state`);
  const data = await res.json();
  return data.state;
}

export async function checkUsernameAvailability(name: string): Promise<{
  available: boolean;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/player/check-username?name=${encodeURIComponent(name)}`);
  const data = await res.json();
  return data;
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
  const res = await fetch(`${API_BASE}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      animal_id: animalId,
      hat_id: hatId || 'none',
      glasses_id: glassesId || 'none',
      outfit_id: outfitId || 'none',
      session_token: sessionToken
    })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to join challenge.');
  }
  return data;
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

