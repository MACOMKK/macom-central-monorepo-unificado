import { Copy, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function PasswordResetDialog({
  form,
  isPending,
  onClose,
  onConfirmPasswordChange,
  onCopyPassword,
  onGeneratePassword,
  onPasswordChange,
  onSubmit,
  open,
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-[420px] rounded-[12px] p-4">
        <DialogHeader>
          <DialogTitle>Definir nova senha</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="new-password">
              Nova senha
            </label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Minimo de 6 caracteres"
                className="h-9 rounded-lg px-3 text-[14px]"
              />
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={onGeneratePassword}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg px-3"
                onClick={onCopyPassword}
                disabled={!form.password}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">
              Confirmar senha
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="Repita a nova senha"
              className="h-9 rounded-lg px-3 text-[14px]"
            />
          </div>
        </div>

        <DialogFooter className="justify-end gap-2 sm:space-x-0">
          <Button type="button" variant="outline" className="h-8 rounded-lg px-4 text-[13px]" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" className="h-8 rounded-lg px-4 text-[13px]" onClick={onSubmit} disabled={isPending}>
            Salvar senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
