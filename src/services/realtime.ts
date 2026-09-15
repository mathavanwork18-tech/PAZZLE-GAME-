import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { MatchState, Player } from '../types/game';

const CHANNEL_NAME = 'engineering-day-challenge';
const MATCH_STATE_STORAGE_KEY = 'eng_match_state_cache';

export interface RealtimeHandlers {
  onConnectionChange: (connected: boolean) => void;
  onMatchStateChange: (state: MatchState) => void;
  onPlayersListChange: (players: Player[]) => void;
  onToast: (message: string) => void;
  onCountdown: () => void;
  onPlayerKicked?: (playerId: string) => void;
}

let channel: RealtimeChannel | null = null;
let currentTrackingPlayer: Player | null = null;
let activeHandlers: RealtimeHandlers | null = null;

// Initial Default Match State
export function getDefaultMatchState(): MatchState {
  try {
    const cached = localStorage.getItem(MATCH_STATE_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.match_id) return parsed;
    }
  } catch (e) {
    // ignore
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

export function saveCachedMatchState(state: MatchState) {
  try {
    localStorage.setItem(MATCH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

/**
 * Initialize unified Supabase Realtime channel.
 * Connects all clients across Netlify, mobile, and desktops to ONE global room.
 */
export function initRealtime(handlers: RealtimeHandlers) {
  activeHandlers = handlers;

  // Clean up any existing channel
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  const newChannel = supabase.channel(CHANNEL_NAME, {
    config: {
      broadcast: { self: true },
      presence: { key: currentTrackingPlayer?.session_token || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` }
    }
  });

  // 1. PRESENCE TRACKING: Synchronizes live players across all devices
  newChannel.on('presence', { event: 'sync' }, () => {
    const presenceState = newChannel.presenceState();
    const livePlayers: Player[] = [];
    const seenIds = new Set<string>();

    for (const key of Object.keys(presenceState)) {
      const items = presenceState[key] as any[];
      if (items && items.length > 0) {
        const p = items[items.length - 1];
        if (p && p.name && !seenIds.has(p.player_id || key)) {
          seenIds.add(p.player_id || key);
          livePlayers.push({
            id: p.id || p.player_id || key,
            player_id: p.player_id || p.id || key,
            name: p.name,
            animal_id: p.animal_id || 'fox',
            hat_id: p.hat_id || 'none',
            glasses_id: 'none',
            outfit_id: 'none',
            total_score: Number(p.total_score) || 0,
            coins: Number(p.coins) || 0,
            current_round: p.current_round || 1,
            status: p.status || 'WAITING',
            connection_status: 'connected',
            session_token: key,
            joined_at: Number(p.joined_at) || Date.now(),
            last_seen_at: Date.now(),
            round_1_score: Number(p.round_1_score) || 0,
            round_2_score: Number(p.round_2_score) || 0,
            completed_round_1: Boolean(p.completed_round_1),
            completed_round_2: Boolean(p.completed_round_2),
            round_1_moves: p.round_1_moves || 0,
            round_2_moves: p.round_2_moves || 0,
            round_1_time_ms: p.round_1_time_ms || 0,
            round_2_time_ms: p.round_2_time_ms || 0,
            shuffled_puzzle_r1: p.shuffled_puzzle_r1,
            shuffled_puzzle_r2: p.shuffled_puzzle_r2,
            current_board: p.current_board,
            correct_pieces_count: p.correct_pieces_count
          } as Player);
        }
      }
    }

    // Sort players: highest score first, then earliest join
    livePlayers.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return a.joined_at - b.joined_at;
    });

    handlers.onPlayersListChange(livePlayers);
  });

  // 2. BROADCAST: Match state machine updates across all connected devices
  newChannel
    .on('broadcast', { event: 'MATCH_STATE_UPDATE' }, (event) => {
      if (event.payload) {
        saveCachedMatchState(event.payload);
        handlers.onMatchStateChange(event.payload);
      }
    })
    .on('broadcast', { event: 'MATCH_STARTED' }, () => {
      handlers.onCountdown();
    })
    .on('broadcast', { event: 'MATCH_STOPPED' }, (event) => {
      handlers.onToast(event.payload?.message || 'Match stopped by administrator');
    })
    .on('broadcast', { event: 'MATCH_RESET' }, () => {
      handlers.onToast('Match progress has been reset by organizer');
    })
    .on('broadcast', { event: 'TOAST' }, (event) => {
      if (event.payload?.message) {
        handlers.onToast(event.payload.message);
      }
    })
    .on('broadcast', { event: 'PLAYER_KICKED' }, (event) => {
      if (handlers.onPlayerKicked && event.payload?.player_id) {
        handlers.onPlayerKicked(event.payload.player_id);
      }
    });

  // Subscribe to channel
  newChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      handlers.onConnectionChange(true);
      if (currentTrackingPlayer) {
        await trackPlayerPresence(currentTrackingPlayer);
      }
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      handlers.onConnectionChange(false);
    }
  });

  channel = newChannel;

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}

/**
 * Track or update player presence in the global room
 */
export async function trackPlayerPresence(player: Player) {
  currentTrackingPlayer = player;
  if (channel) {
    try {
      await channel.track({
        id: player.id,
        player_id: player.player_id,
        name: player.name,
        animal_id: player.animal_id,
        hat_id: player.hat_id,
        status: player.status,
        total_score: player.total_score,
        coins: player.coins,
        current_round: player.current_round,
        completed_round_1: player.completed_round_1,
        completed_round_2: player.completed_round_2,
        round_1_score: player.round_1_score,
        round_2_score: player.round_2_score,
        round_1_moves: player.round_1_moves,
        round_2_moves: player.round_2_moves,
        round_1_time_ms: player.round_1_time_ms,
        round_2_time_ms: player.round_2_time_ms,
        joined_at: player.joined_at,
        shuffled_puzzle_r1: player.shuffled_puzzle_r1,
        shuffled_puzzle_r2: player.shuffled_puzzle_r2,
        current_board: player.current_board,
        correct_pieces_count: player.correct_pieces_count,
        connection_status: 'connected'
      });
    } catch (e) {
      console.warn('Failed to track player presence:', e);
    }
  }
}

/**
 * Broadcast match state to all connected players
 */
export async function broadcastMatchState(state: MatchState) {
  saveCachedMatchState(state);
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'MATCH_STATE_UPDATE',
        payload: state
      });
    } catch (e) {
      console.warn('Failed to broadcast match state:', e);
    }
  }
}

/**
 * Broadcast 3-2-1 match start trigger to all devices
 */
export async function broadcastStartMatch() {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'MATCH_STARTED'
      });
    } catch (e) {
      console.warn('Failed to broadcast match start:', e);
    }
  }
}

/**
 * Broadcast match stopped event
 */
export async function broadcastStopMatch(message = 'Match stopped by administrator') {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'MATCH_STOPPED',
        payload: { message }
      });
    } catch (e) {
      console.warn('Failed to broadcast stop match:', e);
    }
  }
}

/**
 * Broadcast match reset event
 */
export async function broadcastResetMatch() {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'MATCH_RESET'
      });
    } catch (e) {
      console.warn('Failed to broadcast reset match:', e);
    }
  }
}

/**
 * Broadcast toast notification to all players
 */
export async function broadcastToast(message: string) {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'TOAST',
        payload: { message }
      });
    } catch (e) {
      console.warn('Failed to broadcast toast:', e);
    }
  }
}

/**
 * Broadcast kicked player notification
 */
export async function broadcastKickPlayer(playerId: string) {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'PLAYER_KICKED',
        payload: { player_id: playerId }
      });
    } catch (e) {
      console.warn('Failed to broadcast kick player:', e);
    }
  }
}
