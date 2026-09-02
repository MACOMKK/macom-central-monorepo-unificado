import { PasswordChangeForm as SharedPasswordChangeForm } from '@macom/ui';
import { toast } from 'sonner';

import { useAuth } from '@/lib/AuthContext';

export default function PasswordChangeForm({
  required = false,
  onCancel,
  onSuccess,
}) {
  const { changePassword } = useAuth();

  return (
    <SharedPasswordChangeForm
      required={required}
      onCancel={onCancel}
      onSubmit={changePassword}
      onSuccess={() => {
        toast.success('Senha atualizada com sucesso.');
        onSuccess?.();
      }}
    />
  );
}
