import { MoreHorizontal } from 'lucide-react';

export default function MenuTriggerButton({ onClick }) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={onClick}
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
}
