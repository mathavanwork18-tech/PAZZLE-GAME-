import React from 'react';
import { Bell } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-xs w-full px-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-lg flex items-center space-x-2.5"
        >
          <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold truncate">{t.message}</span>
        </div>
      ))}
    </div>
  );
};
