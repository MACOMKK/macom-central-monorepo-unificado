import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const toneMap = {
  success: {
    wrapper: 'border-emerald-200 bg-white text-emerald-950 shadow-[0_10px_30px_rgba(16,185,129,0.14)]',
    icon: 'text-emerald-600',
  },
  error: {
    wrapper: 'border-red-200 bg-white text-red-950 shadow-[0_10px_30px_rgba(239,68,68,0.14)]',
    icon: 'text-red-600',
  },
};

export default function FeedbackToast({ feedback, onClose, duration = 3200 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!feedback) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        onClose?.();
      }, 220);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, feedback, onClose]);

  if (!feedback) return null;

  const tone = toneMap[feedback.type] || toneMap.success;
  const Icon = feedback.type === 'error' ? AlertCircle : CheckCircle2;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] sm:bottom-6 sm:right-6">
      <div
        className={`pointer-events-auto flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        } ${tone.wrapper}`}
      >
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tone.icon}`} />
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">{feedback.message}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
