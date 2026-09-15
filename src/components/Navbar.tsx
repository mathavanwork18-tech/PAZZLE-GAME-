import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Wifi, WifiOff, LogOut } from 'lucide-react';
import { sounds } from '../services/sound';
import { Player } from '../types/game';

interface NavbarProps {
  isConnected: boolean;
  onAdminClick: () => void;
  isAdminMode?: boolean;
  player?: Player | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  onAdminClick,
  isAdminMode,
  player,
  onLogout
}) => {
  const [muted, setMuted] = useState(sounds.getMuted());

  const handleToggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-3.5 py-2.5 sm:px-6 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xs tracking-wider">ED</span>
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-wider leading-none uppercase">
              Engineering Day
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-600 font-semibold tracking-wider uppercase mt-0.5">
              Puzzle Challenge
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Connection Status Indicator */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-600" />}
            <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>

          {/* Sound Toggle (Default OFF) */}
          <button
            onClick={handleToggleSound}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 btn-press"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
          </button>

          {/* Active Player Badge & Logout Button */}
          {player && onLogout && !isAdminMode && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1 border-l border-slate-200">
              <div
                className="hidden md:flex items-center space-x-1.5 bg-blue-50 px-2 py-1 rounded-xl border border-blue-200/80 max-w-[130px]"
                title={`Logged in as ${player.name} (${player.player_id || 'Player'})`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {player.name}
                </span>
              </div>

              <button
                onClick={onLogout}
                aria-label="Log Out of Challenge"
                title="Log Out"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all btn-press"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}

          {/* Protected Admin Access Entry */}
          <button
            onClick={onAdminClick}
            aria-label={isAdminMode ? 'Exit Admin Dashboard' : 'Open Admin Portal'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border btn-press ${
              isAdminMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAdminMode ? 'Exit Admin' : 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
