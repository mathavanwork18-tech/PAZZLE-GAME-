import React, { useEffect, useState } from 'react';
import { Player, LeaderboardEntry, Avatar } from '../types/game';
import { Trophy, Coins, Award, Clock, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { AvatarRenderer } from '../components/AvatarRenderer';
import { fetchLeaderboard } from '../services/api';

interface ResultPageProps {
  currentPlayer: Player;
  avatars: Avatar[];
  onBackToHome: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  currentPlayer,
  onBackToHome
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const currentRank = leaderboard.find((p) => p.id === currentPlayer.id)?.rank || '-';
  const totalTimeSeconds = Math.round(
    ((currentPlayer.round_1_time_ms || 0) + (currentPlayer.round_2_time_ms || 0)) / 1000
  );
  const timeMinutes = Math.floor(totalTimeSeconds / 60);
  const timeSecs = totalTimeSeconds % 60;
  const formattedTime = `${String(timeMinutes).padStart(2, '0')}:${String(timeSecs).padStart(2, '0')}`;

  const bothCompleted = currentPlayer.completed_round_1 && currentPlayer.completed_round_2;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 animate-fade-in pb-24">
      {/* Result Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
          <Award className="w-3.5 h-3.5" />
          <span>Official Event Results</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
          {bothCompleted ? 'CHALLENGE COMPLETE' : 'YOUR RESULT'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Engineering Day Puzzle Challenge • Live Event Standings
        </p>
      </div>

      {/* Main Player Result Card (Exact format from Prompt #52) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 mb-5 pb-5 border-b border-slate-100">
          <AvatarRenderer
            animalId={currentPlayer.animal_id}
            hatId={currentPlayer.hat_id}
            glassesId={currentPlayer.glasses_id}
            outfitId={currentPlayer.outfit_id}
            size="2xl"
            className="border-2 border-blue-200/80 shadow-md shrink-0"
          />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border border-blue-200">
                {currentPlayer.player_id || 'ENG-0001'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Student
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 truncate mt-1">
              {currentPlayer.name}
            </h3>
            <p className="text-xs text-slate-500 capitalize">
              {currentPlayer.animal_id} Mascot
            </p>

            {/* Rank Badge */}
            <div className="mt-3 inline-flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              <span className="text-xs font-bold text-slate-600">YOUR RANK:</span>
              <span className="text-sm font-black text-blue-700 font-mono">#{currentRank}</span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Final Score</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {currentPlayer.total_score || (currentPlayer.round_1_score + currentPlayer.round_2_score)}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Coins Earned</div>
            <div className="text-xl font-black text-blue-700 font-mono mt-1 flex items-center justify-center space-x-1">
              <Coins className="w-4 h-4 text-blue-600" />
              <span>{currentPlayer.coins || 0}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Round 1</div>
            <div className="text-xs font-bold font-mono mt-1.5 flex items-center justify-center space-x-1 text-emerald-600">
              {currentPlayer.completed_round_1 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>COMPLETED</span>
                </>
              ) : (
                <span className="text-slate-400">NOT COMPLETED</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Round 2</div>
            <div className="text-xs font-bold font-mono mt-1.5 flex items-center justify-center space-x-1 text-emerald-600">
              {currentPlayer.completed_round_2 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>COMPLETED</span>
                </>
              ) : (
                <span className="text-slate-400">NOT COMPLETED</span>
              )}
            </div>
          </div>
        </div>

        {/* Time Used */}
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono">
          <span className="text-slate-500 font-bold font-sans">TIME USED</span>
          <span className="font-bold text-slate-800">{formattedTime}</span>
        </div>
      </div>

      {/* Live Event Leaderboard */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Live Event Leaderboard
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold">
            {leaderboard.length} Players Ranked
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading leaderboard...
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {leaderboard.map((item) => {
              const isSelf = item.id === currentPlayer.id;
              return (
                <div
                  key={item.id}
                  className={`p-3 sm:px-4 flex items-center space-x-3 transition-all ${
                    isSelf ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-7 text-center font-mono font-black text-xs">
                    {item.rank === 1 ? (
                      <span className="text-amber-600 font-bold">#1</span>
                    ) : item.rank === 2 ? (
                      <span className="text-slate-600 font-bold">#2</span>
                    ) : item.rank === 3 ? (
                      <span className="text-amber-700 font-bold">#3</span>
                    ) : (
                      <span className="text-slate-400">#{item.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <AvatarRenderer
                    animalId={item.animal_id}
                    hatId={item.hat_id}
                    glassesId={item.glasses_id}
                    outfitId={item.outfit_id}
                    size="sm"
                    className="border-0 shadow-none bg-transparent"
                  />

                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {item.name} {isSelf && <span className="text-blue-600 font-normal">(You)</span>}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      R1: {item.round_1_score} • R2: {item.round_2_score} • Coins: {item.coins}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0 font-mono">
                    <div className="text-sm font-black text-slate-900">
                      {item.total_score}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(item.total_time_ms / 1000).toFixed(0)}s
                    </div>
                  </div>
                </div>
              );
            })}

            {leaderboard.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Results will appear here once players begin.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back to Home CTA */}
      <div className="flex justify-center">
        <button
          onClick={onBackToHome}
          className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-2 border border-slate-300 transition-all btn-press"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO EVENT LOBBY</span>
        </button>
      </div>
    </div>
  );
};
