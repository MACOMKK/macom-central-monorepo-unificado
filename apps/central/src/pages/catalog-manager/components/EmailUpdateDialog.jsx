import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function EmailUpdateDialog({
  collaborator,
  form,
  isPending,
  onClose,
  onConfirmEmailChange,
  onEmailChange,
  onResetPasswordChange,
  onSubmit,
  open,
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-[460px] rounded-[12px] p-4">
        <DialogHeader>
          <DialogTitle>Atualizar email de acesso</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Email atual</p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">
              {collaborator?.email || 'Sem email cadastrado'}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="new-access-email">
              Novo email
            </label>
            <Input
              id="new-access-email"
              type="email"
              value={form.email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="usuario@macom.com"
              className="h-9 rounded-lg px-3 text-[14px]"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="confirm-access-email">
              Confirmar novo email
            </label>
            <Input
              id="confirm-access-email"
              type="email"
              value={form.confirmEmail}
              onChange={(event) => onConfirmEmailChange(event.target.value)}
              placeholder="Repita o novo email"
              className="h-9 rounded-lg px-3 text-[14px]"
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.resetPassword}
              onChange={(event) => onResetPasswordChange(event.target.checked)}
            />
            <span>
              Redefinir senha para <span className="font-semibold">Kmacom.123</span>
            </span>
          </label>
        </div>

        <DialogFooter className="justify-end gap-2 sm:space-x-0">
          <Button type="button" variant="outline" className="h-8 rounded-lg px-4 text-[13px]" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" className="h-8 rounded-lg px-4 text-[13px]" onClick={onSubmit} disabled={isPending}>
            Atualizar email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
