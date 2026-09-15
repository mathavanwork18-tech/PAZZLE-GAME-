import React, { useState, useEffect } from 'react';
import { LogOut, Eye, Ban, Clock, Sparkles } from 'lucide-react';
import { MatchState, Player, Avatar, HatId, GlassesId, OutfitId } from './types/game';
import { Navbar } from './components/Navbar';
import { ToastContainer, ToastItem } from './components/ToastContainer';
import { WelcomePage } from './pages/WelcomePage';
import { UsernameSetupPage } from './pages/UsernameSetupPage';
import { AvatarSelectPage } from './pages/AvatarSelectPage';
import { AvatarCustomizePage } from './pages/AvatarCustomizePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { fetchAvatars, fetchMatchState, joinPlayer, restoreSession, sendHeartbeat, logoutPlayer } from './services/api';
import { initRealtime, trackPlayerPresence } from './services/realtime';

type AppView = 
  | 'welcome'
  | 'setup-username'
  | 'setup-avatar'
  | 'setup-customize'
  | 'lobby'
  | 'game'
  | 'results'
  | 'admin';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      if (p.includes('admin') || h.includes('admin')) {
        return 'admin';
      }
    }
    return 'welcome';
  });
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);

  // Player Onboarding Temporary State
  const [chosenUsername, setChosenUsername] = useState<string>('');
  const [chosenAvatarId, setChosenAvatarId] = useState<string>('panda');
  const [chosenHat, setChosenHat] = useState<HatId>('none');
  const [chosenGlasses, setChosenGlasses] = useState<GlassesId>('none');
  const [chosenOutfit, setChosenOutfit] = useState<OutfitId>('none');

  // Connection & Synchronization
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serverNowOffset, setServerNowOffset] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Toast Notification Helper
  const showToast = (message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initial Load & Session Recovery
  useEffect(() => {
    const init = async () => {
      try {
        const avs = await fetchAvatars();
        setAvatars(avs);

        const state = await fetchMatchState();
        setMatchState(state);
        setServerNowOffset(Date.now() - state.server_now);

        // Attempt player session recovery from localStorage
        const savedToken = localStorage.getItem('eng_player_token');
        if (savedToken) {
          try {
            const restored = await restoreSession(savedToken);
            setPlayer(restored.player);
            setChosenUsername(restored.player.name);
            setChosenAvatarId(restored.player.animal_id);
            setChosenHat(restored.player.hat_id);
            setChosenGlasses(restored.player.glasses_id);
            setChosenOutfit(restored.player.outfit_id);

            // Authoritative route based on match state and player status
            const isAdminRoute = typeof window !== 'undefined' && 
              (window.location.pathname.toLowerCase().includes('admin') || window.location.hash.toLowerCase().includes('admin'));

            if (!isAdminRoute) {
              if (restored.player.player_status === 'KICKED') {
                // Stay in kicked state
              } else if (restored.player.player_status === 'SPECTATOR') {
                // Stay in spectator state
              } else if (restored.match_state.status === 'ROUND_1' || restored.match_state.status === 'ROUND_2') {
                if (restored.player.completed_round_2) {
                  setCurrentView('results');
                } else {
                  setCurrentView('game');
                }
              } else if (restored.match_state.status === 'COMPLETED') {
                setCurrentView('results');
              } else if (restored.match_state.status === 'STOPPED') {
                setCurrentView('game');
              } else {
                setCurrentView('lobby');
              }
            }
          } catch (e) {
            localStorage.removeItem('eng_player_token');
          }
        }
      } catch (err) {
        console.error('Initial load failed:', err);
      }
    };

    init();
  }, []);

  // Synchronized 3-2-1-GO Countdown Loop from Authoritative Server Timestamp
  useEffect(() => {
    if (matchState?.status !== 'COUNTDOWN' || !matchState.countdown_target_at) {
      setCountdownSeconds(null);
      return;
    }

    const targetAt = matchState.countdown_target_at;
    const updateCountdown = () => {
      const serverNow = Date.now() - serverNowOffset;
      const msLeft = targetAt - serverNow;
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setCountdownSeconds(secLeft);

      if (secLeft === 0) {
        setCountdownSeconds(0);
        setTimeout(() => {
          setCountdownSeconds(null);
          if (player && player.player_status !== 'SPECTATOR' && player.player_status !== 'KICKED') {
            setCurrentView('game');
          }
        }, 1000);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 200);
    return () => clearInterval(interval);
  }, [matchState?.status, matchState?.countdown_target_at, serverNowOffset, player]);

  // Unified Realtime Engine (Native WebSocket primary with auto-reconnect)
  useEffect(() => {
    const cleanup = initRealtime({
      onConnectionChange: (connected) => {
        setIsConnected(connected);
      },
      onMatchStateChange: (nextState: MatchState) => {
        setMatchState(nextState);

        // Synchronize routing based on authoritative state
        if (nextState.status === 'ROUND_1' || nextState.status === 'ROUND_2') {
          setCurrentView((prev) => {
            if (prev === 'lobby' || prev === 'welcome' || prev === 'setup-username' || prev === 'setup-avatar' || prev === 'setup-customize') {
              if (player?.player_status !== 'SPECTATOR' && player?.player_status !== 'KICKED') {
                return 'game';
              }
            }
            return prev;
          });
        } else if (nextState.status === 'COMPLETED') {
          setCurrentView((prev) => (prev === 'game' ? 'results' : prev));
        } else if (nextState.status === 'WAITING') {
          setCurrentView((prev) => (prev === 'game' || prev === 'results' ? 'lobby' : prev));
        }
      },
      onPlayersListChange: (list: Player[]) => {
        setPlayersList(list);
      },
      onToast: (message: string) => {
        showToast(message);
      },
      onCountdown: (data) => {
        if (data?.countdown_target_at) {
          setMatchState((prev) => prev ? {
            ...prev,
            status: 'COUNTDOWN',
            countdown_start_at: data.countdown_start_at,
            countdown_target_at: data.countdown_target_at
          } : null);
        }
      },
      onPlayerAdmitted: (data) => {
        if (player && (player.id === data.player_id || player.player_id === data.player_id)) {
          setPlayer((prev) => prev ? {
            ...prev,
            player_status: 'PLAYING',
            status: 'PLAYING',
            game_status: 'PLAYING',
            admitted_by_admin: true,
            admitted_at: Date.now()
          } : null);
          showToast('You have been admitted to the match by the administrator!');
          setCurrentView('game');
        }
      },
      onPlayerKicked: (kickedId: string, reason?: string) => {
        if (player && (player.id === kickedId || player.player_id === kickedId)) {
          setPlayer((prev) => prev ? {
            ...prev,
            player_status: 'KICKED',
            status: 'KICKED',
            game_status: 'KICKED'
          } : null);
          showToast(reason || 'You have been removed from the match by an administrator.');
        }
      }
    });

    return () => {
      cleanup();
    };
  }, [player]);

  // Keep player presence updated across room
  useEffect(() => {
    if (player) {
      trackPlayerPresence(player);
    }
  }, [player]);

  // Periodic heartbeat
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      sendHeartbeat(player.session_token);
      trackPlayerPresence(player);
    }, 8000);
    return () => clearInterval(interval);
  }, [player]);

  // Step 1 -> Step 2
  const handleUsernameConfirmed = (name: string) => {
    setChosenUsername(name);
    setCurrentView('setup-avatar');
  };

  // Step 2 -> Step 3
  const handleAvatarConfirmed = () => {
    setCurrentView('setup-customize');
  };

  // Step 3 -> Join Player & Enter Lobby
  const handleCustomizationConfirmed = async () => {
    setIsJoining(true);
    try {
      const res = await joinPlayer(
        chosenUsername,
        chosenAvatarId,
        chosenHat,
        chosenGlasses,
        chosenOutfit,
        player?.session_token
      );
      setPlayer(res.player);
      localStorage.setItem('eng_player_token', res.session_token);
      setMatchState(res.match_state);
      trackPlayerPresence(res.player);

      showToast(`Welcome ${res.player.name}! You've entered the challenge.`);
      
      if (res.is_late_joiner || res.player.player_status === 'SPECTATOR') {
        showToast('Match is currently in progress. You are in spectator mode.');
      } else if (res.match_state.status === 'ROUND_1' || res.match_state.status === 'ROUND_2') {
        setCurrentView('game');
      } else {
        setCurrentView('lobby');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to enter lobby.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRefreshPlayer = async () => {
    if (player) {
      try {
        const res = await restoreSession(player.session_token);
        setPlayer(res.player);
      } catch (e) {
        // ignore
      }
    }
  };

  const refreshState = async () => {
    try {
      const state = await fetchMatchState();
      setMatchState(state);
    } catch (e) {
      // ignore
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logoutPlayer(player);
    } catch (e) {
      localStorage.removeItem('eng_player_token');
      localStorage.removeItem('eng_player_data');
    }
    setPlayer(null);
    setChosenUsername('');
    setChosenAvatarId('panda');
    setChosenHat('none');
    setChosenGlasses('none');
    setChosenOutfit('none');
    setCurrentView('welcome');
    showToast('Logged out successfully.');
  };

  // Special Screen: Kicked Player Screen
  if (player && (player.player_status === 'KICKED' || player.status === 'KICKED') && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none antialiased">
        <Navbar
          isConnected={isConnected}
          onAdminClick={() => setCurrentView('admin')}
          isAdminMode={false}
          player={player}
          onLogout={handleLogoutClick}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-8 max-w-md w-full text-center shadow-xl animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-rose-700 uppercase tracking-tight">
              YOU HAVE BEEN REMOVED FROM THE MATCH
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Your session was removed from this competition by an administrator.
            </p>
            <div className="my-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium text-left">
              <div><strong>Player:</strong> {player.name} ({player.player_id || player.id})</div>
              <div className="mt-1">Please contact the event coordinator if you believe this was a mistake.</div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all btn-press"
            >
              Exit to Welcome Screen
            </button>
          </div>
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  // Special Screen: Late Joiner Spectator Screen
  if (player && (player.player_status === 'SPECTATOR' || player.status === 'SPECTATOR') && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
        <Navbar
          isConnected={isConnected}
          onAdminClick={() => setCurrentView('admin')}
          isAdminMode={false}
          player={player}
          onLogout={handleLogoutClick}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl p-8 max-w-md w-full text-center shadow-xl animate-fade-in">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              MATCH ALREADY STARTED
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              You joined after the competition began. You are currently in <strong>spectator mode</strong>.
            </p>
            <div className="my-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Status: WAITING FOR ADMIN</span>
              </div>
              <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                Please contact the event administrator. They can admit you using the Emergency Admission system.
              </p>
              <div className="mt-3 pt-2 border-t border-amber-200 text-[11px] font-mono text-slate-700">
                Player ID: <span className="font-bold text-slate-900">{player.player_id || player.id}</span> ({player.name})
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleRefreshPlayer}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider transition-all btn-press shadow-sm"
              >
                Check Admission Status
              </button>
              <button
                onClick={handleLogoutClick}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all btn-press"
              >
                Log Out
              </button>
            </div>
          </div>
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased relative">
      {/* Synchronized 3-2-1-GO Countdown Fullscreen Overlay */}
      {countdownSeconds !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in select-none">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Synchronized Event Start</span>
          </div>
          <div className="text-8xl sm:text-9xl font-black tracking-tighter animate-bounce text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 drop-shadow-2xl">
            {countdownSeconds > 0 ? countdownSeconds : 'GO!'}
          </div>
          <p className="text-slate-300 text-sm uppercase tracking-widest mt-6 font-bold">
            {countdownSeconds > 0 ? 'Round 1 starting in' : 'Challenge Live!'}
          </p>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        onAdminClick={() => setCurrentView((prev) => (prev === 'admin' ? (player ? 'lobby' : 'welcome') : 'admin'))}
        isAdminMode={currentView === 'admin'}
        player={player}
        onLogout={handleLogoutClick}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full flex flex-col">
        {/* 1. Welcome Screen */}
        {currentView === 'welcome' && (
          <WelcomePage
            onEnter={() => (player ? setCurrentView('lobby') : setCurrentView('setup-username'))}
            playerCount={playersList.length}
            maxPlayers={matchState?.max_players || 40}
            currentPlayer={player}
            onLogout={handleLogoutClick}
          />
        )}

        {/* 2. Username Setup */}
        {currentView === 'setup-username' && (
          <UsernameSetupPage
            initialName={chosenUsername}
            onContinue={handleUsernameConfirmed}
            onBack={() => setCurrentView('welcome')}
          />
        )}

        {/* 3. Animal Avatar Selection */}
        {currentView === 'setup-avatar' && (
          <AvatarSelectPage
            avatars={avatars}
            selectedAvatarId={chosenAvatarId}
            onSelectAvatar={setChosenAvatarId}
            onContinue={handleAvatarConfirmed}
            onBack={() => setCurrentView('setup-username')}
            username={chosenUsername}
          />
        )}

        {/* 4. Avatar Customization */}
        {currentView === 'setup-customize' && (
          <AvatarCustomizePage
            animalId={chosenAvatarId}
            username={chosenUsername}
            selectedHat={chosenHat}
            selectedGlasses={chosenGlasses}
            selectedOutfit={chosenOutfit}
            onSelectHat={setChosenHat}
            onSelectGlasses={setChosenGlasses}
            onSelectOutfit={setChosenOutfit}
            onConfirm={handleCustomizationConfirmed}
            onBack={() => setCurrentView('setup-avatar')}
            isJoining={isJoining}
          />
        )}

        {/* 5. Main Lobby */}
        {currentView === 'lobby' && player && (
          <LobbyPage
            currentPlayer={player}
            playersList={playersList}
            avatars={avatars}
            maxPlayers={matchState?.max_players || 40}
            countdown={countdownSeconds}
            onLogout={handleLogoutClick}
          />
        )}

        {/* 6. Active Gameplay */}
        {currentView === 'game' && player && matchState && (
          <GamePage
            matchState={matchState}
            player={player}
            onRefreshPlayer={handleRefreshPlayer}
            onGoToResults={() => setCurrentView('results')}
            serverNowOffset={serverNowOffset}
          />
        )}

        {/* 7. Final Results & Standings */}
        {currentView === 'results' && player && (
          <ResultPage
            currentPlayer={player}
            avatars={avatars}
            onBackToHome={() => setCurrentView(matchState?.status === 'WAITING' ? 'lobby' : 'welcome')}
            onLogout={handleLogoutClick}
          />
        )}

        {/* 8. Admin Control Console */}
        {currentView === 'admin' && matchState && (
          <AdminPage
            matchState={matchState}
            playersList={playersList}
            avatars={avatars}
            onRefreshState={refreshState}
            onExitAdmin={() => setCurrentView(player ? 'lobby' : 'welcome')}
          />
        )}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3.5 border border-rose-100">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Log Out of Challenge?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {currentView === 'game'
                ? 'You are currently in an active game! Logging out will exit your current puzzle session.'
                : 'You will be logged out of this session and returned to the welcome screen.'}
            </p>
            <div className="mt-5 flex space-x-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all btn-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all btn-press shadow-sm"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
};
