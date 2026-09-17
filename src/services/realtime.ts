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
let pingInterval: any = null;
let isCleanedUp = false;
let reconnectAttempts = 0;
let hasLoggedStaticNotice = false;
let hasLoggedWsError = false;

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
 * Check if the application is running on a static hosting platform (e.g. Netlify, Vercel)
 * without an external backend URL explicitly configured.
 */
function isStaticHostWithoutBackend(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  const isStaticPlatform =
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.surge.sh');

  const hasConfiguredBackend = Boolean(
    (import.meta.env.VITE_WS_URL || '').trim() ||
    (import.meta.env.VITE_API_URL || '').trim()
  );

  return isStaticPlatform && !hasConfiguredBackend;
}

/**
 * Determine the optimal WebSocket URL.
 * Returns null if running on a static host where no backend WebSocket server exists.
 */
function getWebSocketUrl(): string | null {
  const envWs = (import.meta.env.VITE_WS_URL || '').trim();
  if (envWs) return envWs;

  const envApi = (import.meta.env.VITE_API_URL || '').trim();
  if (envApi) {
    try {
      const parsed = new URL(envApi);
      const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${parsed.host}/ws`;
    } catch (e) {
      // ignore
    }
  }

  if (typeof window === 'undefined') return 'ws://localhost:3001/ws';

  // Netlify and other static platforms cannot host persistent native WebSocket servers.
  // Returning null avoids repeated "WebSocket connection to 'wss://.../ws' failed" console errors.
  if (isStaticHostWithoutBackend()) {
    return null;
  }

  const isHttps = window.location.protocol === 'https:';
  const wsProto = isHttps ? 'wss:' : 'ws:';

  // In local Vite dev environment on port 5173, connect directly to Express server on 3001
  // using whatever hostname/IP the client accessed (e.g. localhost, 10.x.x.x, 192.168.x.x)
  if (window.location.port === '5173') {
    const host = window.location.hostname || '127.0.0.1';
    return `${wsProto}//${host}:3001/ws`;
  }

  return `${wsProto}//${window.location.host}/ws`;
}

/**
 * Connect to primary server-authoritative native WebSocket endpoint
 */
function connectNativeWebSocket(handlers: RealtimeHandlers) {
  if (isCleanedUp) return;
  if (nativeWs && (nativeWs.readyState === WebSocket.OPEN || nativeWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = getWebSocketUrl();
  if (!wsUrl) {
    if (!hasLoggedStaticNotice) {
      hasLoggedStaticNotice = true;
      console.info(
        `ℹ️ [Realtime] Native WebSocket skipped: Frontend is running on Netlify/static host (${window.location.hostname}) without VITE_WS_URL configured.\n` +
        `Netlify cannot host persistent WebSocket servers. Supabase Realtime channel is active for live sync.\n` +
        `To enable the native WebSocket server, deploy server/server.js (e.g. on Render or Railway) and set VITE_WS_URL in Netlify environment variables.`
      );
    }
    return;
  }

  try {
    const ws = new WebSocket(wsUrl);
    nativeWs = ws;

    ws.onopen = () => {
      if (ws !== nativeWs) return;
      reconnectAttempts = 0;
      hasLoggedWsError = false;
      console.log('📡 Connected to Server Native WebSocket at', wsUrl);
      handlers.onConnectionChange(true);

      // Start 15s keepalive ping to prevent proxy/browser idle disconnects
      clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (nativeWs && nativeWs.readyState === WebSocket.OPEN) {
          try {
            nativeWs.send(JSON.stringify({ type: 'PING' }));
          } catch (e) {
            // ignore
          }
        }
      }, 15000);

      if (currentTrackingPlayer) {
        ws.send(JSON.stringify({
          type: 'IDENTIFY',
          session_token: currentTrackingPlayer.session_token
        }));
      }
    };

    ws.onmessage = (event) => {
      if (ws !== nativeWs) return;
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

          case 'PONG':
            // Heartbeat response acknowledged
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      // Avoid spamming the console repeatedly on reconnect attempts
      if (!hasLoggedWsError && reconnectAttempts < 2) {
        hasLoggedWsError = true;
        console.warn(`[Realtime] Native WebSocket unreachable at ${wsUrl}. Retrying with exponential backoff...`);
      }
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
      if (ws === nativeWs) {
        nativeWs = null;
        if (!isCleanedUp) {
          handlers.onConnectionChange(false);
          clearTimeout(wsReconnectTimer);

          reconnectAttempts++;
          // Exponential backoff: ~1.5s -> 2.25s -> 3.37s -> 5s -> 7.5s ... max 30s
          const delay = Math.min(30000, Math.round(1500 * Math.pow(1.5, Math.min(reconnectAttempts, 8))));

          wsReconnectTimer = setTimeout(() => {
            if (activeHandlers && !isCleanedUp) {
              connectNativeWebSocket(activeHandlers);
            }
          }, delay);
        }
      }
    };
  } catch (e) {
    if (!hasLoggedWsError) {
      hasLoggedWsError = true;
      console.warn('Failed to establish Native WebSocket connection:', e);
    }
  }
}

// Auto-reconnect on tab visibility restore
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isCleanedUp) {
      if (!nativeWs || nativeWs.readyState !== WebSocket.OPEN) {
        if (activeHandlers) {
          connectNativeWebSocket(activeHandlers);
        }
      }
    }
  });
}

/**
 * Initialize unified dual-engine Realtime.
 * Primary: Native WebSocket to Express server.
 * Secondary: Supabase Realtime channel fallback.
 */
export function initRealtime(handlers: RealtimeHandlers) {
  isCleanedUp = false;
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
    isCleanedUp = true;
    clearInterval(pingInterval);
    clearTimeout(wsReconnectTimer);

    if (nativeWs) {
      nativeWs.onopen = null;
      nativeWs.onclose = null;
      nativeWs.onerror = null;
      nativeWs.onmessage = null;
      nativeWs.close();
      nativeWs = null;
    }

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
