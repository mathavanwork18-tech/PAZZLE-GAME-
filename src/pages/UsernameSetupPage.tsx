import React, { useState, useEffect, useRef } from 'react';
import { User, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { checkUsernameAvailability } from '../services/api';
import { sounds } from '../services/sound';

interface UsernameSetupPageProps {
  initialName?: string;
  onContinue: (username: string) => void;
  onBack: () => void;
}

export const UsernameSetupPage: React.FC<UsernameSetupPageProps> = ({
  initialName = '',
  onContinue,
  onBack
}) => {
  const [username, setUsername] = useState(initialName);
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const checkTimeoutRef = useRef<any>(null);

  // Debounced backend check
  useEffect(() => {
    const trimmed = username.trim();

    if (!trimmed) {
      setAvailability(null);
      setIsChecking(false);
      return;
    }

    if (trimmed.length < 3) {
      setAvailability({ available: false, message: 'Minimum 3 characters required.' });
      setIsChecking(false);
      return;
    }

    if (trimmed.length > 20) {
      setAvailability({ available: false, message: 'Maximum 20 characters allowed.' });
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(trimmed);
        setAvailability(res);
      } catch (err) {
        if (trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
          setAvailability({ available: true, message: 'Username available' });
        } else {
          setAvailability({ available: false, message: 'Please enter a valid username.' });
        }
      } finally {
        setIsChecking(false);
      }
    }, 250);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length >= 3 && clean.length <= 20 && (availability?.available ?? true)) {
      sounds.playPieceSelect();
      onContinue(clean);
    }
  };

  const isFormValid = username.trim().length >= 3 && username.trim().length <= 20 && (availability?.available ?? true) && !isChecking;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-64px)] p-4 sm:p-6 max-w-md mx-auto animate-fade-in">
      <div className="w-full pt-4 sm:pt-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 mb-4">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
          <span className="text-slate-900 font-bold">Player Name</span>
          <span className="text-slate-300">•</span>
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">2</span>
          <span>Mascot</span>
          <span className="text-slate-300">•</span>
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">3</span>
          <span>Hat Style</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Choose your player name
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            This name identifies your score and rank on the event leaderboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Player Username</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Mathavan"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all pr-10"
              />

              {/* Status Indicator Icon */}
              <div className="absolute right-3.5 top-3.5">
                {isChecking && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {!isChecking && availability?.available && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-fade-in" />
                )}
                {!isChecking && availability && !availability.available && (
                  <AlertCircle className="w-5 h-5 text-rose-500 animate-fade-in" />
                )}
              </div>
            </div>

            {/* Availability Message Badge */}
            {availability && (
              <div className="mt-2.5">
                {availability.available ? (
                  <p className="text-emerald-700 text-xs font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Username available</span>
                  </p>
                ) : (
                  <p className="text-rose-600 text-xs font-semibold flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{availability.message}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
            Names are case-insensitive. Duplicate entries (e.g. Mathavan vs mathavan) will be rejected to ensure event integrity.
          </div>
        </form>
      </div>

      {/* Navigation Buttons */}
      <div className="w-full pb-6 space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all btn-press ${
            isFormValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>SELECT ANIMAL AVATAR</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Back to Welcome Screen
        </button>
      </div>
    </div>
  );
};
