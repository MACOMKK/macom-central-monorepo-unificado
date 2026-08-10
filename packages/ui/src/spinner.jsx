import { cva } from 'class-variance-authority';

import { cn } from './lib/utils';

const spinnerVariants = cva('animate-spin rounded-full border-current/25 border-t-current', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-2',
      default: 'h-5 w-5 border-2',
      lg: 'h-8 w-8 border-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function Spinner({ className, size, ...props }) {
  return (
    <div role="status" aria-label="Carregando" className={cn(spinnerVariants({ size }), className)} {...props} />
  );
}

function PageLoader({ className, spinnerClassName, size = 'default', label, ...props }) {
  return (
    <main
      className={cn('flex min-h-screen items-center justify-center bg-background', className)}
      {...props}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-card px-6 py-4 shadow-sm">
        <Spinner size={size} className={cn('text-primary', spinnerClassName)} />
        {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      </div>
    </main>
  );
}

export { Spinner, spinnerVariants, PageLoader };
