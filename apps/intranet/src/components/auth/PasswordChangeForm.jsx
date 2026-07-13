import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/AuthContext';

const INITIAL_FORM = {
  password: '',
  confirmPassword: '',
};

export default function PasswordChangeForm({
  required = false,
  onCancel,
  onSuccess,
}) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const validate = () => {
    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (password.length < 8) {
      return 'A nova senha deve ter pelo menos 8 caracteres.';
    }

    if (password !== confirmPassword) {
      return 'As senhas informadas nao conferem.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      await changePassword(form.password.trim());
      setForm(INITIAL_FORM);
      toast.success('Senha atualizada com sucesso.');
      onSuccess?.();
    } catch (error) {
      setMessage(error?.message || 'Nao foi possivel atualizar a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
      {message ? (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="new-password" className="text-sm font-semibold text-slate-700">
            Nova senha
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-950 outline-none transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-new-password" className="text-sm font-semibold text-slate-700">
            Confirmar nova senha
          </label>
          <input
            id="confirm-new-password"
            type={showPassword ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!required && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
            disabled={submitting}
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#E30613] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c80510] disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar nova senha
        </button>
      </div>
    </form>
  );
}
