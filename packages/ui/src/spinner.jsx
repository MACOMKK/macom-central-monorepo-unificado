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

function PageLoader({ className = '', spinnerClassName = '', size = 'default', label = '', ...props }) {
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

const BRAND_ASSEMBLE_CSS = `
@keyframes brand-assemble-top {
  0% { transform: translateY(-260px) scale(0.6); opacity: 0; }
  35% { opacity: 1; }
  55% { transform: translateY(0) scale(1); opacity: 1; }
  80% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-260px) scale(0.6); opacity: 0; }
}
@keyframes brand-assemble-left {
  0% { transform: translate(-220px, 190px) scale(0.6); opacity: 0; }
  35% { opacity: 1; }
  55% { transform: translate(0, 0) scale(1); opacity: 1; }
  80% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(-220px, 190px) scale(0.6); opacity: 0; }
}
@keyframes brand-assemble-right {
  0% { transform: translate(220px, 190px) scale(0.6); opacity: 0; }
  35% { opacity: 1; }
  55% { transform: translate(0, 0) scale(1); opacity: 1; }
  80% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(220px, 190px) scale(0.6); opacity: 0; }
}
@keyframes brand-fade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.9; }
}
.brand-diamond {
  transform-box: view-box;
  transform-origin: 490px 570px;
}
`;

function BrandLoader({ className = '', ...props }) {
  return (
    <main
      role="status"
      aria-label="Carregando"
      className={cn('flex min-h-screen flex-col items-center justify-center gap-6 bg-background', className)}
      {...props}
    >
      <style>{BRAND_ASSEMBLE_CSS}</style>
      <div className="h-[120px] w-[120px]">
        <svg viewBox="0 0 988 850" className="h-full w-full overflow-visible">
          <path
            className="brand-diamond"
            style={{ animation: 'brand-assemble-top 1.8s cubic-bezier(.5,-0.4,.4,1.4) infinite' }}
            fill="#E60012"
            d="M 490,10 L 655,290 L 490,570 L 325,290 Z"
          />
          <path
            className="brand-diamond"
            style={{ animation: 'brand-assemble-left 1.8s cubic-bezier(.5,-0.4,.4,1.4) infinite' }}
            fill="#E60012"
            d="M 175,570 L 490,570 L 345,850 L 0,850 Z"
          />
          <path
            className="brand-diamond"
            style={{ animation: 'brand-assemble-right 1.8s cubic-bezier(.5,-0.4,.4,1.4) infinite' }}
            fill="#E60012"
            d="M 490,570 L 805,570 L 988,850 L 645,850 Z"
          />
        </svg>
      </div>
      <span
        className="text-sm uppercase tracking-[4px] text-[#e63946]"
        style={{ animation: 'brand-fade 1.4s ease-in-out infinite' }}
      >
        Carregando
      </span>
    </main>
  );
}

export { Spinner, spinnerVariants, PageLoader, BrandLoader };
