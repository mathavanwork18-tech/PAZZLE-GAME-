import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { MatchState, Player } from '../types/game';

const SUPABASE_CHANNEL_NAME = 'engineering-day-challenge';
const MATCH_STATE_STORAGE_KEY = 'eng_match_state_cache';

export interface RealtimeHandlers {
  onConnectionChange: (connected: boolean) => void;
  onMatchStateChange: (state: MatchState) => void;
  onPlayersListChange: (players: Player[]) => void;
  onToast: (message: string) => void;
  onCountdown: (data?: { countdown_start_at?: number; countdown_target_at?: number; server_now?: number }) => void;
  onPlayerKicked?: (playerId: string, reason?: string) => void;
  onPlayerAdmitted?: (data: { player_id: string; player: Player; current_round: number }) => void;
}

let nativeWs: WebSocket | null = null;
let sbChannel: RealtimeChannel | null = null;
let currentTrackingPlayer: Player | null = null;
let activeHandlers: RealtimeHandlers | null = null;
let wsReconnectTimer: any = null;

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
    match_id: 'MATCH-0001',
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
    countdown_start_at: null,
    countdown_target_at: null,
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
 * Connect to primary server-authoritative native WebSocket endpoint
 */
function connectNativeWebSocket(handlers: RealtimeHandlers) {
  if (nativeWs && (nativeWs.readyState === WebSocket.OPEN || nativeWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  // Determine WebSocket URL: use relative /ws (handled by Vite proxy) or fallback
  const isHttps = window.location.protocol === 'https:';
  const wsProto = isHttps ? 'wss:' : 'ws:';
  let wsUrl = `${wsProto}//${window.location.host}/ws`;

  // If in dev and vite proxy is localhost:5173, /ws proxies to 3001
  try {
    nativeWs = new WebSocket(wsUrl);

    nativeWs.onopen = () => {
      console.log('📡 Connected to Server Native WebSocket at', wsUrl);
      handlers.onConnectionChange(true);
      if (currentTrackingPlayer) {
        nativeWs?.send(JSON.stringify({
          type: 'IDENTIFY',
          session_token: currentTrackingPlayer.session_token
        }));
      }
    };

    nativeWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data || !data.type) return;

        switch (data.type) {
          case 'INIT_SYNC':
            if (data.payload?.match_state) {
              saveCachedMatchState(data.payload.match_state);
              handlers.onMatchStateChange(data.payload.match_state);
            }
            break;

          case 'MATCH_STATE_UPDATE':
            if (data.payload) {
              saveCachedMatchState(data.payload);
              handlers.onMatchStateChange(data.payload);
            }
            break;

          case 'MATCH_COUNTDOWN':
            handlers.onCountdown(data.payload);
            break;

          case 'MATCH_STARTED':
            handlers.onToast('Match started! Round 1 is live!');
            break;

          case 'MATCH_STOPPED':
            handlers.onToast(data.payload?.message || 'Match stopped by administrator');
            break;

          case 'MATCH_RESET':
            handlers.onToast('Match has been reset by organizer');
            break;

          case 'PLAYERS_LIST_UPDATE':
            if (data.payload?.players) {
              handlers.onPlayersListChange(data.payload.players);
            }
            break;

          case 'PLAYER_ADMITTED':
            if (handlers.onPlayerAdmitted && data.payload) {
              handlers.onPlayerAdmitted(data.payload);
            }
            break;

          case 'PLAYER_KICKED':
            if (handlers.onPlayerKicked && data.payload?.player_id) {
              handlers.onPlayerKicked(data.payload.player_id, data.payload?.reason);
            }
            break;

          case 'TOAST':
            if (data.payload?.message) {
              handlers.onToast(data.payload.message);
            }
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    nativeWs.onerror = (err) => {
      console.warn('Native WebSocket error:', err);
    };

    nativeWs.onclose = () => {
      console.log('Native WebSocket disconnected, retrying in 3s...');
      nativeWs = null;
      handlers.onConnectionChange(false);
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(() => {
        if (activeHandlers) connectNativeWebSocket(activeHandlers);
      }, 3000);
    };
  } catch (e) {
    console.warn('Failed to establish Native WebSocket connection:', e);
  }
}

/**
 * Initialize unified dual-engine Realtime.
 * Primary: Native WebSocket to Express server.
 * Secondary: Supabase Realtime channel fallback.
 */
export function initRealtime(handlers: RealtimeHandlers) {
  activeHandlers = handlers;

  // 1. Connect Primary Native WebSocket
  connectNativeWebSocket(handlers);

  // 2. Connect Secondary Supabase Realtime channel (Dual sync)
  try {
    if (sbChannel) {
      supabase.removeChannel(sbChannel);
      sbChannel = null;
    }

    const newChannel = supabase.channel(SUPABASE_CHANNEL_NAME, {
      config: {
        broadcast: { self: true },
        presence: { key: currentTrackingPlayer?.session_token || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` }
      }
    });

    newChannel
      .on('broadcast', { event: 'MATCH_STATE_UPDATE' }, (event) => {
        if (event.payload) {
          saveCachedMatchState(event.payload);
          handlers.onMatchStateChange(event.payload);
        }
      })
      .on('broadcast', { event: 'MATCH_COUNTDOWN' }, (event) => {
        handlers.onCountdown(event.payload);
      })
      .on('broadcast', { event: 'PLAYER_ADMITTED' }, (event) => {
        if (handlers.onPlayerAdmitted && event.payload) {
          handlers.onPlayerAdmitted(event.payload);
        }
      })
      .on('broadcast', { event: 'PLAYER_KICKED' }, (event) => {
        if (handlers.onPlayerKicked && event.payload?.player_id) {
          handlers.onPlayerKicked(event.payload.player_id, event.payload?.reason);
        }
      })
      .on('broadcast', { event: 'TOAST' }, (event) => {
        if (event.payload?.message) {
          handlers.onToast(event.payload.message);
        }
      });

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onConnectionChange(true);
      }
    });

    sbChannel = newChannel;
  } catch (err) {
    console.warn('Supabase Realtime fallback notice:', err);
  }

  return () => {
    if (nativeWs) {
      nativeWs.close();
      nativeWs = null;
    }
    clearTimeout(wsReconnectTimer);
    if (sbChannel) {
      supabase.removeChannel(sbChannel);
      sbChannel = null;
    }
  };
}

export function trackPlayerPresence(player: Player) {
  currentTrackingPlayer = player;
  if (nativeWs && nativeWs.readyState === WebSocket.OPEN) {
    nativeWs.send(JSON.stringify({
      type: 'IDENTIFY',
      session_token: player.session_token
    }));
  }
}

export function untrackPlayerPresence() {
  currentTrackingPlayer = null;
}
