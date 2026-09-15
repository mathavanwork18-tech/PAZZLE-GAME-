import React, { useState, useEffect } from 'react';
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
import { fetchAvatars, fetchMatchState, joinPlayer, restoreSession, sendHeartbeat, savePlayerNameToSupabase } from './services/api';
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
  const [currentView, setCurrentView] = useState<AppView>('welcome');
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
  const [countdown, setCountdown] = useState<number | null>(null);

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

            // Authoritative route based on match state
            if (restored.match_state.status === 'ROUND_1' || restored.match_state.status === 'ROUND_2') {
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

  // Unified Multiplayer Engine (Supabase Realtime Cloud Sync - Connects all devices globally)
  useEffect(() => {
    const cleanup = initRealtime({
      onConnectionChange: (connected) => {
        setIsConnected(connected);
      },
      onMatchStateChange: (nextState: MatchState) => {
        setMatchState((prev) => {
          if (prev && prev.status === 'WAITING' && nextState.status === 'ROUND_1') {
            runCountdown();
          }
          return nextState;
        });

        // Route active connected players based on match state
        if (nextState.status === 'ROUND_1' || nextState.status === 'ROUND_2') {
          setCurrentView((prev) => {
            if (prev === 'lobby' || prev === 'welcome' || prev === 'setup-username' || prev === 'setup-avatar' || prev === 'setup-customize') {
              return 'game';
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
      onCountdown: () => {
        runCountdown();
      },
      onPlayerKicked: (kickedId: string) => {
        if (player && (player.id === kickedId || player.player_id === kickedId)) {
          localStorage.removeItem('eng_player_token');
          localStorage.removeItem('eng_player_data');
          setPlayer(null);
          setCurrentView('welcome');
          showToast('You were removed from the match by an administrator.');
        }
      }
    });

    return () => {
      cleanup();
    };
  }, []);

  // Keep player presence updated across room whenever player state updates
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

  // Synchronized 3-2-1-GO Countdown Sequence
  const runCountdown = () => {
    setCountdown(3);
    setTimeout(() => setCountdown(2), 900);
    setTimeout(() => setCountdown(1), 1800);
    setTimeout(() => setCountdown(0), 2700);
    setTimeout(() => {
      setCountdown(null);
      setCurrentView('game');
    }, 3300);
  };

  // Step 1 -> Step 2
  const handleUsernameConfirmed = (name: string) => {
    setChosenUsername(name);
    savePlayerNameToSupabase(name);
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
      await trackPlayerPresence(res.player);

      showToast(`Welcome ${res.player.name}! You've entered the lobby.`);
      
      if (res.match_state.status === 'ROUND_1' || res.match_state.status === 'ROUND_2') {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        onAdminClick={() => setCurrentView((prev) => (prev === 'admin' ? (player ? 'lobby' : 'welcome') : 'admin'))}
        isAdminMode={currentView === 'admin'}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full flex flex-col">
        {/* 1. Welcome Screen */}
        {currentView === 'welcome' && (
          <WelcomePage
            onEnter={() => (player ? setCurrentView('lobby') : setCurrentView('setup-username'))}
            playerCount={playersList.length}
            maxPlayers={matchState?.max_players || 40}
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
            countdown={countdown}
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

      {/* Real-Time Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
};
