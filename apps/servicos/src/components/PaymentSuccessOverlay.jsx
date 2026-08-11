import { useEffect } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@macom/ui';

const AUTO_CLOSE_MS = 1800;

export default function PaymentSuccessOverlay({ open, message, onOpenChange }) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => onOpenChange(false), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-xs flex-col items-center gap-3 py-8 text-center [&>button]:hidden">
        <DialogTitle className="sr-only">{message}</DialogTitle>
        <div className="payment-check-wrapper">
          <svg width="72" height="72" viewBox="0 0 52 52" fill="none">
            <circle
              className="payment-check-circle"
              cx="26"
              cy="26"
              r="24"
              stroke="hsl(142 71% 45%)"
              strokeWidth="2.5"
            />
            <path
              className="payment-check-mark"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
              stroke="hsl(142 71% 45%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-base font-semibold">{message}</p>
      </DialogContent>
    </Dialog>
  );
}
