import React from 'react';
import { Player, Avatar } from '../types/game';
import { Users, Clock, Wifi, CheckCircle2 } from 'lucide-react';
import { AvatarRenderer } from '../components/AvatarRenderer';

interface LobbyPageProps {
  currentPlayer: Player;
  playersList: Player[];
  avatars: Avatar[];
  maxPlayers: number;
  countdown: number | null; // 3, 2, 1, 0, or null
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  currentPlayer,
  playersList,
  maxPlayers,
  countdown
}) => {
  const isFull = playersList.length >= maxPlayers;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in pb-24 relative">
      {/* Synchronized 3-2-1-GO Countdown Modal */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
          <div className="text-8xl sm:text-9xl font-black text-white font-mono tracking-tighter animate-bounce">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
          <p className="text-sm sm:text-base text-blue-200 font-bold uppercase tracking-widest mt-4">
            Starting Round 1 Challenge
          </p>
        </div>
      )}

      {/* Main Lobby Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
          Engineering Day
        </h2>
        <p className="text-xs sm:text-sm font-bold text-blue-600 tracking-wider uppercase mt-0.5">
          Puzzle Challenge
        </p>
      </div>

      {/* Current Player Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-6 flex items-center space-x-4">
        <AvatarRenderer
          animalId={currentPlayer.animal_id}
          hatId={currentPlayer.hat_id}
          glassesId={currentPlayer.glasses_id}
          outfitId={currentPlayer.outfit_id}
          size="lg"
          className="border-2 border-blue-600/30 shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Your Player Status
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>WAITING FOR MATCH</span>
            </span>
          </div>

          <h3 className="text-xl font-black text-slate-900 truncate mt-0.5">
            {currentPlayer.name}
          </h3>

          <p className="text-xs text-slate-500 capitalize">
            Mascot: <strong className="text-slate-700">{currentPlayer.animal_id}</strong>
          </p>
        </div>
      </div>

      {/* Live Participant Count Header */}
      <div className="bg-white px-5 py-4 rounded-3xl border border-slate-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Players Joined
            </span>
          </div>
          <span className="text-sm font-black text-blue-700 font-mono">
            {playersList.length} / {maxPlayers} PLAYERS
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (playersList.length / maxPlayers) * 100)}%` }}
          />
        </div>

        {isFull && (
          <p className="text-rose-600 text-xs font-semibold mt-2">
            Lobby is full. Please contact the event coordinator.
          </p>
        )}
      </div>

      {/* Joined Players Avatar Wall / Responsive Grid */}
      <div className="mb-6">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
          Joined Players ({playersList.length})
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {playersList.map((p, idx) => {
            const isSelf = p.id === currentPlayer.id;
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-2xl flex items-center space-x-2.5 border transition-all ${
                  isSelf
                    ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <AvatarRenderer
                  animalId={p.animal_id}
                  hatId={p.hat_id}
                  glassesId={p.glasses_id}
                  outfitId={p.outfit_id}
                  size="sm"
                  className="shadow-none border-0 bg-transparent"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.connection_status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {p.name} {isSelf && <span className="text-blue-600 text-[10px]">(You)</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {playersList.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
            No players have joined yet.
          </div>
        )}
      </div>

      {/* Live Server Heartbeat Bar */}
      <div className="text-center bg-white py-3 px-4 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center justify-center space-x-2">
        <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
        <span>Connected to live event. Match starts automatically when organizer begins.</span>
      </div>
    </div>
  );
};
