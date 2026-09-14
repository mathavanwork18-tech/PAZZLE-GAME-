import React from 'react';
import { ArrowRight, Puzzle, Cpu, Trophy, Compass, ShieldCheck } from 'lucide-react';

interface WelcomePageProps {
  onEnter: () => void;
  playerCount: number;
  maxPlayers: number;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onEnter, playerCount, maxPlayers }) => {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-64px)] p-4 sm:p-6 max-w-md mx-auto animate-fade-in">
      {/* Top Event Header */}
      <div className="text-center pt-4 sm:pt-8 w-full">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>College Engineering Day</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase font-sans">
          Engineering Day
        </h1>
        <h2 className="text-xl sm:text-2xl font-black text-blue-700 uppercase tracking-wide mt-1">
          Puzzle Challenge
        </h2>

        <p className="text-slate-600 text-sm font-medium mt-2 italic">
          "Think fast. Solve smart."
        </p>
      </div>

      {/* Center Engineering Graphic & Feature Overview */}
      <div className="w-full my-6 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
        {/* Subtle CSS Engineering Puzzle Icon Mosaic */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
          <Puzzle className="w-10 h-10 stroke-[1.75]" />
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center mb-5">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
            <Puzzle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Round 1</div>
            <div className="text-xs font-bold text-slate-800">5×5 Easy</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
            <Cpu className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Round 2</div>
            <div className="text-xs font-bold text-slate-800">25-Piece</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
            <Trophy className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Scoring</div>
            <div className="text-xs font-bold text-slate-800">Points + Coins</div>
          </div>
        </div>

        {/* Live Lobby Status Pill */}
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-700">Event Lobby Status</span>
          </div>
          <span className="text-xs font-black text-blue-700 font-mono">
            {playerCount} / {maxPlayers} Players Joined
          </span>
        </div>
      </div>

      {/* Bottom CTA Primary Button */}
      <div className="w-full pb-6">
        <button
          onClick={onEnter}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm hover:shadow flex items-center justify-center space-x-2.5 transition-all btn-press"
        >
          <span>START CHALLENGE</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center space-x-1.5 text-slate-500 text-[11px] mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Independent multiplayer state • Mobile optimized</span>
        </div>
      </div>
    </div>
  );
};
