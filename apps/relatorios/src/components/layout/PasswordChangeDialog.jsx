import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Button, useToast } from '@macom/ui';
import { supabase } from '@/api/supabaseClient';

export default function PasswordChangeDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleUpdate = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Senha invalida', description: 'Use pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Senha invalida', description: 'As senhas nao conferem.' });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);

    if (error) {
      toast({ title: 'Falha ao alterar senha', description: error.message });
      return;
    }

    toast({ title: 'Senha alterada com sucesso!' });
    onOpenChange(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-wider text-sm">Alterar Minha Senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Nova senha</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Confirmar senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <Button onClick={handleUpdate} disabled={isSaving || !newPassword || !confirmPassword}>
              {isSaving ? 'Salvando...' : 'Salvar senha'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
