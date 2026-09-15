import React, { useState, useEffect } from 'react';
import { MatchState, Player } from '../types/game';
import { PuzzleBoard } from '../components/PuzzleBoard';
import { CountdownTimer } from '../components/CountdownTimer';
import { AvatarRenderer } from '../components/AvatarRenderer';
import { Trophy, Coins, CheckCircle2, ArrowRight, Pause, Ban, Sparkles } from 'lucide-react';
import { submitPuzzle, advanceRound2 } from '../services/api';
import { trackPlayerPresence } from '../services/realtime';
import { sounds } from '../services/sound';
import { v4 as uuidv4 } from 'uuid';

interface GamePageProps {
  matchState: MatchState;
  player: Player;
  onRefreshPlayer: () => Promise<void>;
  onGoToResults: () => void;
  serverNowOffset: number;
}

export const GamePage: React.FC<GamePageProps> = ({
  matchState,
  player,
  onRefreshPlayer,
  onGoToResults,
  serverNowOffset
}) => {
  const isPlayerInRound2 = player.completed_round_1;
  const currentRound = isPlayerInRound2 ? 2 : 1;
  const isRound1 = currentRound === 1;
  const isRound2 = currentRound === 2;

  // Canonical solution is 0..24 for 5x5
  const canonicalSolution = Array.from({ length: 25 }, (_, i) => i);

  // Initialize player pieces from independent shuffled puzzle
  const [pieces, setPieces] = useState<number[]>(() => {
    if (isRound1) {
      return player.shuffled_puzzle_r1 || matchState.current_puzzle?.shuffled_order || [...canonicalSolution].reverse();
    } else {
      return player.shuffled_puzzle_r2 || matchState.current_puzzle?.shuffled_order || [...canonicalSolution].reverse();
    }
  });

  const [coinNotification, setCoinNotification] = useState<{ amount: number; key: number } | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState<boolean>(false);
  const [awardedScore, setAwardedScore] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [transitionToRound2, setTransitionToRound2] = useState<boolean>(false);

  // Switch puzzle image on round switch (Both rounds are Easy 5x5 25 pieces)
  const imageUrl = isRound1
    ? '/puzzles/round1_robotics.webp'
    : '/puzzles/round2_quantum.webp';

  // Broadcast initial board on mount so admin can spectate
  useEffect(() => {
    player.current_board = pieces;
    player.correct_pieces_count = pieces.filter((val, idx) => val === idx).length;
    trackPlayerPresence(player);
  }, []);

  // Handle player transitioning to Round 2 (5x5 Easy)
  useEffect(() => {
    if (isRound2 && pieces.length === 25) {
      if (player.shuffled_puzzle_r2) {
        setPieces([...player.shuffled_puzzle_r2]);
        player.current_board = player.shuffled_puzzle_r2;
        player.correct_pieces_count = player.shuffled_puzzle_r2.filter((val, idx) => val === idx).length;
        trackPlayerPresence(player);
      }
    }
  }, [isRound2]);

  // Handle tile moves and auto-validation (Server-authoritative coins only!)
  const handlePiecesChange = async (newPieces: number[], addedMoves: number) => {
    setPieces(newPieces);
    const updatedMoves = moveCount + addedMoves;
    setMoveCount(updatedMoves);

    // Play tile click
    sounds.playTick();

    // Mirror current board state so admin can spectate live
    player.current_board = newPieces;
    player.correct_pieces_count = newPieces.filter((val, idx) => val === idx).length;
    trackPlayerPresence(player);

    // Auto-check if all 25 pieces are in canonical order
    const isSolved = newPieces.every((val, idx) => val === canonicalSolution[idx]);

    if (isSolved && !isSubmitting) {
      const alreadyCompleted = (isRound1 && player.completed_round_1) || (isRound2 && player.completed_round_2);
      if (alreadyCompleted) return;

      setIsSubmitting(true);
      try {
        const requestId = uuidv4();
        const res = await submitPuzzle({
          session_token: player.session_token,
          round_number: currentRound,
          solution_order: newPieces,
          move_count: updatedMoves,
          request_id: requestId
        });

        if (res.success && res.correct) {
          sounds.playVictory();
          sounds.playCoinsEarned();

          const earned = res.coins_earned || (isRound1 ? 100 : 200);
          setAwardedScore(res.awarded_score || 0);
          setCoinsEarned(earned);
          setCoinNotification({ amount: earned, key: Date.now() });
          setShowCompletionAnimation(true);

          await onRefreshPlayer();

          if (isRound1) {
            // After 1.2s show transition screen, then automatically advance to Round 2
            setTimeout(async () => {
              setShowCompletionAnimation(false);
              setTransitionToRound2(true);

              try {
                await advanceRound2(player.session_token);
                await onRefreshPlayer();
              } catch (e) {
                // ignore
              }

              setTimeout(() => {
                setTransitionToRound2(false);
                setMoveCount(0);
                if (player.shuffled_puzzle_r2) {
                  setPieces([...player.shuffled_puzzle_r2]);
                }
              }, 2000);
            }, 1200);
          } else {
            // Round 2 complete - all challenges finished!
            setTimeout(() => {
              setShowCompletionAnimation(false);
              onGoToResults();
            }, 2500);
          }
        }
      } catch (err: any) {
        console.error('Submission failed:', err);
        alert(err.message || 'Puzzle submission was rejected by the server.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isMatchStopped = matchState.status === 'STOPPED';
  const isMatchPaused = matchState.is_paused || matchState.status === 'PAUSED';
  const isMatchCompleted = matchState.status === 'COMPLETED';
  const isPlayerKicked = player.player_status === 'KICKED';
  const isPlayerSpectator = player.player_status === 'SPECTATOR';
  const isInputLocked = isMatchStopped || isMatchPaused || isMatchCompleted || isPlayerKicked || isPlayerSpectator || transitionToRound2;

  // Authoritative global 10-minute timer
  const matchEndTime = matchState.match_end_time || matchState.round_2_end_at || matchState.round_1_end_at;

  return (
    <div className="max-w-lg mx-auto p-3 sm:p-5 flex flex-col items-center min-h-[calc(100vh-64px)] pb-12 animate-fade-in relative">
      {/* 1. Header */}
      <div className="w-full bg-white rounded-3xl p-4 border border-slate-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Engineering Day Challenge
            </div>
            <div className="text-sm font-black text-slate-900 uppercase">
              {isRound1 ? 'Round 1 — Easy' : 'Round 2 — Hard'}
            </div>
          </div>

          <CountdownTimer
            endTimestamp={matchEndTime}
            serverNowOffset={serverNowOffset}
            isPaused={matchState.is_paused || isMatchStopped}
            onTimeUp={() => {
              sounds.playGameOver();
            }}
          />
        </div>

        {/* Player Metrics Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AvatarRenderer
              animalId={player.animal_id}
              hatId={player.hat_id}
              glassesId={player.glasses_id}
              outfitId={player.outfit_id}
              size="xs"
              className="border-0 shadow-none bg-transparent"
            />
            <span className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
              {player.name}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Score: {player.total_score || 0}</span>
            </div>

            <div className="flex items-center space-x-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
              <Coins className="w-3.5 h-3.5 text-blue-600" />
              <span>Coins: {player.coins || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Authoritative Coins Toast */}
      {coinNotification && (
        <div
          key={coinNotification.key}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-full shadow-xl border-2 border-amber-300 flex items-center space-x-2 animate-bounce"
        >
          <Sparkles className="w-5 h-5 text-amber-950 fill-amber-950" />
          <span>+{coinNotification.amount} OFFICIAL COINS AWARDED!</span>
        </div>
      )}

      {/* 2. Round Info Banner */}
      <div className="w-full flex items-center justify-between px-2 mb-2 text-xs font-semibold text-slate-600">
        <span className="font-bold text-blue-700">
          {isRound1 ? 'Round 1: 5×5 Easy (25 Pieces) • Robotics Rover' : 'Round 2: 5×5 Easy (25 Pieces) • Quantum Engineering'}
        </span>
        <span className="font-mono text-[11px] text-slate-400">{moveCount} moves</span>
      </div>

      {/* 3. Puzzle Board */}
      <div className="relative w-full flex justify-center">
        <PuzzleBoard
          gridSize={5}
          imageUrl={imageUrl}
          pieces={pieces}
          onPiecesChange={handlePiecesChange}
          disabled={isInputLocked}
        />

        {/* Match Paused Overlay */}
        {isMatchPaused && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-40">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center mb-3">
              <Pause className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              MATCH PAUSED
            </h3>
            <p className="text-xs text-slate-200 mt-1 max-w-xs">
              The match has been paused by the administrator. Puzzle inputs are frozen.
            </p>
          </div>
        )}

        {/* Match Stopped Overlay */}
        {isMatchStopped && (
          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-40">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/40 flex items-center justify-center mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider">
              GAME STOPPED
            </h3>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mt-0.5">
              STOPPED BY ADMIN
            </p>
            <p className="text-xs text-slate-300 mt-2 max-w-xs">
              The administrator has stopped this challenge. Puzzle inputs and score submissions are disabled.
            </p>
            <button
              onClick={onGoToResults}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all btn-press flex items-center space-x-1.5"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Completion Animation Overlay */}
      {showCompletionAnimation && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-6">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-xl border border-slate-200 animate-bounce">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              PUZZLE COMPLETE!
            </h3>
            <div className="mt-3 space-y-1.5 font-mono">
              <div className="text-base font-bold text-emerald-700">
                +{awardedScore} SCORE
              </div>
              <div className="text-sm font-bold text-blue-700 flex items-center justify-center space-x-1">
                <Coins className="w-4 h-4" />
                <span>+{coinsEarned} OFFICIAL COINS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Automatic 2-Second Transition to Round 2 */}
      {transitionToRound2 && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6 text-center">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 shadow-2xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Round 1 Complete</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase">
              Round 1 Complete!
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Loading Round 2 (5×5, 25 pieces)...
            </p>
            <div className="mt-5 text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center justify-center space-x-2">
              <span>ENTERING ROUND 2</span>
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* 6. Game Over / Timer Expiration Modal */}
      {isMatchCompleted && !isMatchStopped && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6 text-center">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl">
            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 font-mono">
              Time's Up
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">
              GAME OVER
            </h3>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 mb-5 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5 font-sans">
                <span className="text-slate-500 font-semibold">Player</span>
                <span className="font-bold text-slate-900">{player.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Round Reached</span>
                <span className="font-bold text-blue-700">{player.completed_round_1 ? 'Round 2' : 'Round 1'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Total Score</span>
                <span className="font-bold text-slate-900">{player.total_score}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Coins Earned</span>
                <span className="font-bold text-amber-600">{player.coins}</span>
              </div>
            </div>

            <button
              onClick={onGoToResults}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm flex items-center justify-center space-x-2 transition-all btn-press"
            >
              <span>VIEW FULL LEADERBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
