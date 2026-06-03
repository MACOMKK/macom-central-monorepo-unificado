import { createPortal } from 'react-dom';
import { KeyRound, Pencil, RefreshCw, Trash2 } from 'lucide-react';

export default function CollaboratorActionsMenu({
  canDelete = true,
  canResetPassword = true,
  canUnlinkAll,
  isUnlinking,
  menu,
  onDelete,
  onEdit,
  onResetPassword,
  onUnlinkAll,
}) {
  if (!menu) return null;

  return createPortal(
    <div
      className="fixed z-50 min-w-[180px] rounded-lg border border-border bg-background p-1 shadow-lg"
      style={{ top: menu.top, right: menu.right }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
        Editar
      </button>
      {canResetPassword ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
          onClick={onResetPassword}
        >
          <KeyRound className="h-4 w-4" />
          Redefinir senha
        </button>
      ) : null}
      {canUnlinkAll ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
          onClick={onUnlinkAll}
          disabled={isUnlinking}
        >
          <RefreshCw className="h-4 w-4" />
          Desvincular tudo
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-destructive transition-colors hover:bg-muted"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      ) : null}
    </div>,
    document.body
  );
}
