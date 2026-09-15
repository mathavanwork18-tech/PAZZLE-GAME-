import React, { useState } from 'react';
import { MatchState, Player, Avatar } from '../types/game';
import {
  Shield, Play, Pause, Square, RotateCcw,
  Users, Download, Trash2, Key, Search,
  Clock, AlertTriangle, Coins, Ban
} from 'lucide-react';
import {
  adminLogin, adminStartMatch, adminStopMatch, adminPause,
  adminResume, adminResetMatch, adminEndMatch, adminRemovePlayer,
  adminClearAllPlayers
} from '../services/api';
import { AvatarRenderer } from '../components/AvatarRenderer';

interface AdminPageProps {
  matchState: MatchState;
  playersList: Player[];
  avatars: Avatar[];
  onRefreshState: () => Promise<void>;
  onExitAdmin: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  matchState,
  playersList,
  onRefreshState,
  onExitAdmin
}) => {
  const [adminToken, setAdminToken] = useState<string>(sessionStorage.getItem('eng_admin_token') || '');
  const [code, setCode] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'playing' | 'completed' | 'disconnected'>('all');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmText: string;
    danger?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const token = await adminLogin(code);
      setAdminToken(token);
      sessionStorage.setItem('eng_admin_token', token);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin access code.');
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    sessionStorage.removeItem('eng_admin_token');
  };

  // 1. START MATCH
  const handleStartMatch = () => {
    setConfirmModal({
      title: 'Start Match for All Players?',
      description: `This will trigger the synchronized 3-2-1 countdown and transition all ${playersList.length} players into Round 1.`,
      confirmText: 'START MATCH NOW',
      action: async () => {
        setActionLoading(true);
        try {
          await adminStartMatch(adminToken);
          await onRefreshState();
        } catch (e: any) {
          alert(e.message);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // 2. STOP MATCH (Fixes previous issue)
  const handleStopMatch = () => {
    setConfirmModal({
      title: 'Stop Challenge Immediately?',
      description: 'This will freeze all active puzzle actions, stop the active timer, change match state to STOPPED, and notify all players that the match has been stopped by the administrator.',
      confirmText: 'STOP MATCH',
      danger: true,
      action: async () => {
        setActionLoading(true);
        try {
          await adminStopMatch(adminToken);
          await onRefreshState();
        } catch (e: any) {
          alert(e.message);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // 3. PAUSE / RESUME MATCH
  const handlePauseToggle = async () => {
    setActionLoading(true);
    try {
      if (matchState.is_paused) {
        await adminResume(adminToken);
      } else {
        await adminPause(adminToken);
      }
      await onRefreshState();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. RESET MATCH (Safely resets progress, scores, coins, returns to WAITING)
  const handleResetMatch = () => {
    setConfirmModal({
      title: 'Reset the Current Match?',
      description: 'This will reset player game progress, scores, coins, and puzzle states back to WAITING. Registered usernames and avatars will remain in the lobby.',
      confirmText: 'CONFIRM RESET',
      danger: true,
      action: async () => {
        setActionLoading(true);
        try {
          await adminResetMatch(adminToken);
          await onRefreshState();
        } catch (e: any) {
          alert(e.message);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // 5. END MATCH EARLY
  const handleEndMatch = () => {
    setConfirmModal({
      title: 'Finalize and End Match?',
      description: 'This will conclude the competition, freeze scores, and finalize the leaderboard results.',
      confirmText: 'END MATCH',
      action: async () => {
        setActionLoading(true);
        try {
          await adminEndMatch(adminToken);
          await onRefreshState();
        } catch (e: any) {
          alert(e.message);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleClearAllPlayers = () => {
    setConfirmModal({
      title: 'Wipe All Players & Dummy Data?',
      description: `This will completely remove all ${playersList.length} player registrations from the database so fresh players can register and join cleanly.`,
      confirmText: 'CLEAR ALL PLAYERS',
      danger: true,
      action: async () => {
        setActionLoading(true);
        try {
          await adminClearAllPlayers(adminToken);
          await onRefreshState();
        } catch (e: any) {
          alert(e.message);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleKickPlayer = async (playerId: string) => {
    try {
      await adminRemovePlayer(adminToken, playerId);
      await onRefreshState();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/admin/export-csv', '_blank');
  };

  // Unauthenticated Admin Login Screen
  if (!adminToken) {
    return (
      <div className="max-w-sm mx-auto p-4 sm:p-6 min-h-[calc(100vh-100px)] flex flex-col justify-center animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Organizer Authentication
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Enter the event administrative access code
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Access Code"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest text-center"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            {loginError && (
              <p className="text-xs text-rose-600 font-medium">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all btn-press"
            >
              ENTER ADMIN DASHBOARD
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800"
            >
              Back to Player View
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter player list
  const filteredPlayers = playersList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.animal_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'playing') {
      return p.status === 'PLAYING' || p.status === 'ROUND_2_PLAYING';
    }
    if (filterTab === 'completed') {
      return p.completed_round_1 || p.completed_round_2 || p.status === 'COMPLETED';
    }
    if (filterTab === 'disconnected') {
      return p.connection_status === 'disconnected';
    }
    return true;
  });

  const activeConnectedCount = playersList.filter((p) => p.connection_status === 'connected').length;
  const completedCount = playersList.filter((p) => p.completed_round_2).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-fade-in pb-24">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl animate-fade-in">
            <h3 className="text-base font-black text-slate-900 uppercase">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="mt-5 flex space-x-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.action}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all btn-press ${
                  confirmModal.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {actionLoading ? 'Processing...' : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Header (Exact Format from Prompt #12) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1 border border-amber-200">
            <Shield className="w-3 h-3" />
            <span>Event Management Control</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            ENGINEERING DAY
          </h2>
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            ADMIN CONTROL
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 border border-slate-300 shadow-sm transition-all btn-press"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold border border-slate-300 transition-all btn-press"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Status Cards Row (Prompt #12 metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Total Players</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {playersList.length} / {matchState.max_players}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Active Players</div>
          <div className="text-xl font-black text-emerald-600 font-mono mt-0.5 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeConnectedCount} Live</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Completed</div>
          <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
            {completedCount} Solved
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Current Round</div>
          <div className="text-sm font-black text-slate-900 mt-1 uppercase">
            {matchState.status === 'WAITING' ? 'Not Started' : (matchState.current_round === 1 ? 'Round 1 (Easy)' : 'Round 2 (Hard)')}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Remaining Time</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-1">
            {matchState.status === 'WAITING' ? '10:00' : 'In Progress'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Game Status</div>
          <div className={`text-sm font-black font-mono mt-1 ${
            matchState.status === 'STOPPED' ? 'text-rose-600' :
            matchState.is_paused ? 'text-amber-600' :
            matchState.status === 'COMPLETED' ? 'text-blue-700' :
            'text-emerald-700'
          }`}>
            {matchState.is_paused ? 'PAUSED' : matchState.status}
          </div>
        </div>
      </div>

      {/* Admin Operational Controls Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Authoritative Match Operations
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {/* START MATCH */}
          {(matchState.status === 'WAITING' || matchState.status === 'STOPPED') && (
            <button
              onClick={handleStartMatch}
              disabled={actionLoading || playersList.length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all btn-press ${
                playersList.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START MATCH</span>
            </button>
          )}

          {/* STOP MATCH (Working Stop Mode) */}
          {matchState.status !== 'WAITING' && matchState.status !== 'STOPPED' && (
            <button
              onClick={handleStopMatch}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all btn-press"
            >
              <Ban className="w-4 h-4" />
              <span>STOP MATCH</span>
            </button>
          )}

          {/* PAUSE / RESUME */}
          {(matchState.status === 'ROUND_1' || matchState.status === 'ROUND_2') && (
            <button
              onClick={handlePauseToggle}
              disabled={actionLoading}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all btn-press ${
                matchState.is_paused
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {matchState.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{matchState.is_paused ? 'RESUME MATCH' : 'PAUSE MATCH'}</span>
            </button>
          )}

          {/* RESET MATCH */}
          <button
            onClick={handleResetMatch}
            disabled={actionLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 border border-slate-300 transition-all btn-press"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET MATCH</span>
          </button>

          {/* END MATCH */}
          {matchState.status !== 'WAITING' && matchState.status !== 'COMPLETED' && (
            <button
              onClick={handleEndMatch}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 border border-slate-300 transition-all btn-press"
            >
              <Square className="w-4 h-4" />
              <span>END MATCH</span>
            </button>
          )}

          {/* CLEAR ALL PLAYERS / WIPE DUMMY DATA */}
          {playersList.length > 0 && (
            <button
              onClick={handleClearAllPlayers}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center space-x-1.5 border border-rose-200 transition-all btn-press"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>CLEAR ALL PLAYERS</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Participants Monitor Table & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              Live Participants Monitor ({playersList.length})
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab('playing')}
                className={`px-2.5 py-1 rounded-lg ${filterTab === 'playing' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
              >
                Playing
              </button>
              <button
                onClick={() => setFilterTab('completed')}
                className={`px-2.5 py-1 rounded-lg ${filterTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilterTab('disconnected')}
                className={`px-2.5 py-1 rounded-lg ${filterTab === 'disconnected' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
              >
                Disconnected
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-xl bg-slate-50 text-xs text-slate-900 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 w-36"
              />
            </div>
          </div>
        </div>

        {/* Players List Table */}
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No participants match search or filter criteria.
            </div>
          ) : (
            filteredPlayers.map((p, idx) => (
              <div key={p.id} className="p-3 sm:px-4 flex items-center space-x-3 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-mono text-slate-400 w-6">#{idx + 1}</span>

                <AvatarRenderer
                  animalId={p.animal_id}
                  hatId={p.hat_id}
                  glassesId={p.glasses_id}
                  outfitId={p.outfit_id}
                  size="sm"
                  className="border-0 shadow-none bg-transparent"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {p.player_id || p.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                    <span
                      title={p.connection_status === 'connected' ? 'Connected' : 'Disconnected'}
                      className={`w-2 h-2 rounded-full ${
                        p.connection_status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    <span className="capitalize font-medium text-slate-700">{p.animal_id}</span>
                    {p.hat_id && p.hat_id !== 'none' && <span> • Hat: <span className="capitalize">{p.hat_id.replace(/_/g, ' ')}</span></span>}
                    {p.glasses_id && p.glasses_id !== 'none' && <span> • Glasses: <span className="capitalize">{p.glasses_id.replace(/_/g, ' ')}</span></span>}
                    {p.outfit_id && p.outfit_id !== 'none' && <span> • Outfit: <span className="capitalize">{p.outfit_id.replace(/_/g, ' ')}</span></span>}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Round: <strong className="text-blue-600">{p.completed_round_1 ? 'Round 2' : 'Round 1'}</strong> • Status: <strong className="text-slate-700 uppercase">{p.status}</strong>
                  </div>
                </div>

                <div className="text-right font-mono text-xs shrink-0">
                  <div className="font-bold text-slate-900">
                    {(p.round_1_score || 0) + (p.round_2_score || 0)} pts
                  </div>
                  <div className="text-[10px] text-blue-600 flex items-center justify-end space-x-1">
                    <Coins className="w-3 h-3" />
                    <span>{p.coins || 0}</span>
                  </div>
                </div>

                {matchState.status === 'WAITING' && (
                  <button
                    onClick={() => handleKickPlayer(p.id)}
                    title="Remove Player"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
