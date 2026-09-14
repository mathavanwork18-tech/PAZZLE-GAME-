import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { sounds } from '../services/sound';

interface CountdownTimerProps {
  endTimestamp: number | null;
  serverNowOffset: number; // local Date.now() - server_now
  onTimeUp?: () => void;
  isPaused?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTimestamp,
  serverNowOffset,
  onTimeUp,
  isPaused
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endTimestamp) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      if (isPaused) return;

      const estimatedServerNow = Date.now() - serverNowOffset;
      const remainingMs = endTimestamp - estimatedServerNow;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 5 && remainingSec > 0) {
        sounds.playTick();
      }

      if (remainingSec === 0 && onTimeUp) {
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [endTimestamp, serverNowOffset, isPaused, onTimeUp]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let stateClasses = 'bg-slate-100 text-slate-800 border-slate-200';
  let badgeClasses = 'text-slate-500';

  if (secondsRemaining <= 15 && secondsRemaining > 0) {
    stateClasses = 'bg-rose-50 text-rose-700 border-rose-300';
    badgeClasses = 'text-rose-600';
  } else if (secondsRemaining <= 60 && secondsRemaining > 0) {
    stateClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    badgeClasses = 'text-amber-600';
  }

  return (
    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold transition-all ${stateClasses}`}>
      {secondsRemaining <= 60 && secondsRemaining > 0 ? (
        <AlertTriangle className={`w-3.5 h-3.5 ${badgeClasses}`} />
      ) : (
        <Clock className="w-3.5 h-3.5 text-slate-500" />
      )}
      <span className="text-sm sm:text-base tracking-wider">{formatted}</span>
      {isPaused && (
        <span className="text-[10px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1 py-0.5 rounded ml-1 font-sans font-bold">
          Paused
        </span>
      )}
    </div>
  );
};
