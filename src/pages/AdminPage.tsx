import React, { useState, useEffect } from 'react';
import { MatchState, Player, Avatar, CoinTransaction, AuditLogEntry } from '../types/game';
import {
  Shield, Play, Pause, Square, RotateCcw,
  Users, Download, Trash2, Key, Search,
  Clock, AlertTriangle, Coins, Ban, Eye,
  Check, Activity, LogOut, FileText, History,
  Lock, Unlock, UserCheck, RefreshCw
} from 'lucide-react';
import {
  adminLogin, adminStartMatch, adminStopMatch, adminPause,
  adminResume, adminResetMatch, adminEndMatch, adminKickPlayer,
  adminAdmitPlayer, verifyEmergencyCode, fetchAdminPlayers,
  fetchLateJoiners, fetchKickedPlayers, fetchCoinTransactions,
  fetchAuditLogs, adminClearAllPlayers
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

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'late-joiners' | 'kicked' | 'coin-ledger' | 'audit-logs'>('overview');

  // Emergency Admission Code System (Code: 0000 validated server-side)
  const [isEmergencyUnlocked, setIsEmergencyUnlocked] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [emergencyCodeInput, setEmergencyCodeInput] = useState<string>('');
  const [emergencyError, setEmergencyError] = useState<string>('');

  // Kick Confirmation Modal ("KICK PLAYER? Player: Player37 [Cancel] [Confirm Kick]")
  const [kickTarget, setKickTarget] = useState<Player | null>(null);

  // General Action Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmText: string;
    danger?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  // Dedicated data collections
  const [lateJoiners, setLateJoiners] = useState<Player[]>([]);
  const [kickedPlayers, setKickedPlayers] = useState<Player[]>([]);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Refresh tab-specific data
  const loadTabDetails = async () => {
    if (!adminToken) return;
    try {
      if (activeTab === 'late-joiners') {
        const ljs = await fetchLateJoiners(adminToken);
        setLateJoiners(ljs);
      } else if (activeTab === 'kicked') {
        const kps = await fetchKickedPlayers(adminToken);
        setKickedPlayers(kps);
      } else if (activeTab === 'coin-ledger') {
        const txs = await fetchCoinTransactions(adminToken);
        setCoinTransactions(txs);
      } else if (activeTab === 'audit-logs') {
        const logs = await fetchAuditLogs(adminToken);
        setAuditLogs(logs);
      }
    } catch (e) {
      console.warn('Failed to load tab data:', e);
    }
  };

  useEffect(() => {
    loadTabDetails();
  }, [activeTab, adminToken]);

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

  // 1. START MATCH: Initiates Synchronized 3-2-1-GO Countdown
  const handleStartMatch = () => {
    setConfirmModal({
      title: 'Start Synchronized Match Countdown?',
      description: `This will trigger the server-authoritative 3-2-1-GO countdown for all connected players, lock normal lobby admissions, and transition everyone into Round 1.`,
      confirmText: 'START COUNTDOWN NOW',
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

  // 2. STOP MATCH: Freezes timer, disables moves, sets STOPPED in DB & RAM
  const handleStopMatch = () => {
    setConfirmModal({
      title: 'Stop Challenge Immediately?',
      description: 'This will freeze all active puzzle actions, stop the global timer, change match state to STOPPED, and disable all puzzle submissions.',
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

  // 4. RESET MATCH (Clean lobby reset, preserves accounts)
  const handleResetMatch = () => {
    setConfirmModal({
      title: 'Reset Active Match to Lobby?',
      description: 'This will reset player scores, coins, and round states back to WAITING. Registered usernames and avatars remain in the lobby, and late-join restrictions are cleared.',
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
      title: 'Finalize and Conclude Match?',
      description: 'This will conclude the competition, freeze all scores, and finalize the leaderboard.',
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

  // 6. KICK PLAYER
  const handleConfirmKick = async () => {
    if (!kickTarget) return;
    setActionLoading(true);
    try {
      await adminKickPlayer(adminToken, kickTarget.player_id || kickTarget.id);
      await onRefreshState();
      await loadTabDetails();
      setKickTarget(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. EMERGENCY ADMISSION UNLOCK (Code 0000)
  const handleVerifyEmergencyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmergencyError('');
    try {
      await verifyEmergencyCode(adminToken, emergencyCodeInput);
      setIsEmergencyUnlocked(true);
      setShowEmergencyModal(false);
      setEmergencyCodeInput('');
      setActiveTab('late-joiners');
      await loadTabDetails();
    } catch (err: any) {
      setEmergencyError('Invalid emergency code.');
    }
  };

  // 8. ADMIT LATE PLAYER
  const handleAdmitPlayer = async (playerId: string) => {
    setActionLoading(true);
    try {
      await adminAdmitPlayer(adminToken, playerId);
      await onRefreshState();
      await loadTabDetails();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllPlayers = () => {
    setConfirmModal({
      title: 'Clear All Player Records?',
      description: 'This will wipe all player registrations and coin transactions from the database.',
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
      p.animal_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.player_id && p.player_id.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-fade-in pb-24 font-sans">
      {/* 1. General Action Confirmation Modal */}
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

      {/* 2. Specific Player Kick Confirmation Modal (Requirement #16) */}
      {kickTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-rose-300 shadow-2xl animate-fade-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">
              KICK PLAYER?
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              This player will be removed from the match immediately and cannot rejoin by refreshing.
            </p>
            <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
              <strong>Player:</strong> {kickTarget.name} ({kickTarget.player_id || kickTarget.id})
            </div>
            <div className="flex space-x-2.5">
              <button
                onClick={() => setKickTarget(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmKick}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                {actionLoading ? 'Kicking...' : 'Confirm Kick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Emergency Code Admission Modal (Requirement #13: Enter Emergency Code 0000) */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-amber-300 shadow-2xl animate-fade-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">
              ENTER EMERGENCY CODE
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              Enter the emergency coordinator code to unlock late-joiner admission controls.
            </p>

            <form onSubmit={handleVerifyEmergencyCode} className="space-y-3">
              <input
                type="password"
                value={emergencyCodeInput}
                onChange={(e) => setEmergencyCodeInput(e.target.value)}
                placeholder="0000"
                maxLength={8}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {emergencyError && (
                <p className="text-xs text-rose-600 font-bold">
                  {emergencyError}
                </p>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1 border border-amber-200">
            <Shield className="w-3 h-3" />
            <span>Event Management Console</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            ENGINEERING DAY PUZZLE CHALLENGE
          </h2>
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono">
            AUTHORITATIVE MATCH CONTROL • MATCH ID: {matchState.match_id}
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
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold border border-slate-300 transition-all btn-press flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* MATCH CONTROL SECTION (Requirement #41) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          MATCH CONTROL
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleStartMatch}
            disabled={actionLoading || matchState.status === 'ROUND_1' || matchState.status === 'ROUND_2' || matchState.status === 'COUNTDOWN'}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-2 transition-all btn-press"
          >
            <Play className="w-4 h-4" />
            <span>START MATCH</span>
          </button>

          <button
            onClick={handlePauseToggle}
            disabled={actionLoading || matchState.status === 'WAITING' || matchState.status === 'STOPPED' || matchState.status === 'COMPLETED'}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-2 transition-all btn-press"
          >
            <Pause className="w-4 h-4" />
            <span>{matchState.is_paused ? 'RESUME MATCH' : 'PAUSE MATCH'}</span>
          </button>

          <button
            onClick={handleStopMatch}
            disabled={actionLoading || matchState.status === 'STOPPED'}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-2 transition-all btn-press"
          >
            <Square className="w-4 h-4" />
            <span>STOP MATCH</span>
          </button>

          <button
            onClick={handleResetMatch}
            disabled={actionLoading}
            className="px-5 py-3 rounded-2xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-2 transition-all btn-press"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET TO LOBBY</span>
          </button>

          <button
            onClick={handleEndMatch}
            disabled={actionLoading || matchState.status === 'COMPLETED'}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-2 transition-all btn-press"
          >
            <span>END MATCH</span>
          </button>

          <button
            onClick={handleClearAllPlayers}
            disabled={actionLoading}
            className="px-4 py-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider ml-auto flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe Data</span>
          </button>
        </div>
      </div>

      {/* CURRENT MATCH METRICS SECTION (Requirement #41) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Global Status</div>
          <div className="text-xl font-black text-slate-900 uppercase mt-0.5 flex items-center space-x-2">
            <span>{matchState.status}</span>
            {matchState.is_paused && <span className="text-xs text-amber-600">(PAUSED)</span>}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Lobby / Max Players</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {playersList.filter(p => p.player_status !== 'KICKED').length} / {matchState.max_players}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Current Round</div>
          <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
            Round {matchState.current_round}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Late / Spectators</div>
          <div className="text-xl font-black text-amber-600 font-mono mt-0.5">
            {playersList.filter(p => p.player_status === 'SPECTATOR' || p.join_type === 'LATE').length}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (Requirement #41) */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Players ({playersList.length})</span>
        </button>

        <button
          onClick={() => {
            if (!isEmergencyUnlocked) {
              setShowEmergencyModal(true);
            } else {
              setActiveTab('late-joiners');
            }
          }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'late-joiners'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {isEmergencyUnlocked ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
          <span>Emergency Admission / Late Joiners</span>
        </button>

        <button
          onClick={() => setActiveTab('kicked')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'kicked'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Kicked Players</span>
        </button>

        <button
          onClick={() => setActiveTab('coin-ledger')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'coin-ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Coin Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'audit-logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE PLAYERS TABLE (Requirement #40) */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, ID or mascot..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs font-mono text-slate-400">
              Showing {filteredPlayers.length} players
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                <tr>
                  <th className="p-3">Player ID</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Round</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Coins</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{p.player_id || p.id}</td>
                    <td className="p-3 font-sans flex items-center space-x-2">
                      <AvatarRenderer
                        animalId={p.animal_id}
                        hatId={p.hat_id}
                        glassesId={p.glasses_id}
                        outfitId={p.outfit_id}
                        size="xs"
                      />
                      <span className="font-bold text-slate-900">{p.name}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.player_status === 'PLAYING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.player_status === 'SPECTATOR' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        p.player_status === 'KICKED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        p.player_status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.player_status || p.status}
                      </span>
                    </td>
                    <td className="p-3 text-blue-700 font-bold">Round {p.current_round || 1}</td>
                    <td className="p-3 font-bold text-slate-900">{p.total_score || 0}</td>
                    <td className="p-3 font-bold text-amber-600">{p.coins || 0}</td>
                    <td className="p-3 text-[10px] uppercase font-bold text-slate-400">{p.join_type || 'NORMAL'}</td>
                    <td className="p-3 text-right">
                      {p.player_status !== 'KICKED' && (
                        <button
                          onClick={() => setKickTarget(p)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold uppercase transition-all"
                        >
                          Kick
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EMERGENCY ADMISSION / LATE JOINERS (Requirements #12, #14, #15) */}
      {activeTab === 'late-joiners' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Emergency Admission System (Unlocked)
              </h3>
              <p className="text-xs text-slate-500">
                Admit late joiners into the active round ({matchState.current_round}) with remaining match time.
              </p>
            </div>
            <button
              onClick={() => setIsEmergencyUnlocked(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Lock System
            </button>
          </div>

          <div className="space-y-3">
            {lateJoiners.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                No late joiners currently waiting in spectator mode.
              </div>
            ) : (
              lateJoiners.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center space-x-3">
                    <AvatarRenderer
                      animalId={p.animal_id}
                      hatId={p.hat_id}
                      glassesId={p.glasses_id}
                      outfitId={p.outfit_id}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">{p.name} ({p.player_id || p.id})</div>
                      <div className="text-xs text-amber-800 font-mono">
                        Status: <span className="font-bold">{p.player_status || 'SPECTATOR'}</span> • Joined: {new Date(p.joined_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    {p.admitted_by_admin ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>Admitted</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdmitPlayer(p.player_id || p.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all btn-press flex items-center space-x-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>ADMIT TO MATCH</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KICKED PLAYERS LIST (Requirement #41) */}
      {activeTab === 'kicked' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-fade-in">
          <h3 className="text-base font-black text-slate-900 uppercase mb-1">
            Kicked Players Record
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Players permanently excluded from the match. Page refresh does not allow them to return.
          </p>

          <div className="space-y-2">
            {kickedPlayers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                No players have been kicked.
              </div>
            ) : (
              kickedPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50">
                  <div className="font-mono text-xs">
                    <span className="font-bold text-rose-900">{p.name}</span> ({p.player_id || p.id}) • Mascot: {p.animal_id}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-bold uppercase">
                    KICKED
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXACT COIN TRANSACTIONS LEDGER (Requirements #24, #28) */}
      {activeTab === 'coin-ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Authoritative Coin Transaction Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Official records of all +100 and +200 coin rewards recorded in the database.
              </p>
            </div>
            <button
              onClick={loadTabDetails}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="p-3">Tx ID</th>
                  <th className="p-3">Player ID</th>
                  <th className="p-3">Match ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coinTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-700">#{tx.id}</td>
                    <td className="p-3 font-bold text-slate-900">{tx.player_id}</td>
                    <td className="p-3 text-slate-500">{tx.match_id}</td>
                    <td className="p-3 font-bold text-amber-600">+{tx.amount}</td>
                    <td className="p-3 font-bold text-blue-700">{tx.transaction_type}</td>
                    <td className="p-3 text-slate-600">{tx.description}</td>
                    <td className="p-3 text-slate-400">{new Date(tx.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS (Requirement #43) */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                System & Admin Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Chronological log of match events, countdowns, stops, pauses, and player admissions.
              </p>
            </div>
            <button
              onClick={loadTabDetails}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-800 uppercase">[{log.action}]</span>
                  {log.target_player_id && <span className="ml-2 font-bold text-slate-900">Target: {log.target_player_id}</span>}
                  {log.details && <span className="ml-2 text-slate-600">• {log.details}</span>}
                </div>
                <span className="text-[11px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
