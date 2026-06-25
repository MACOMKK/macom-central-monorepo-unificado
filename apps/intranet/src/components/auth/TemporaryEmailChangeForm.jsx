import React, { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/AuthContext';

const INITIAL_FORM = {
  email: '',
  confirmEmail: '',
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function TemporaryEmailChangeForm({ onSuccess }) {
  const { user, changeTemporaryEmail, isTemporaryCadastroEmail } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const validate = () => {
    const email = normalizeEmail(form.email);
    const confirmEmail = normalizeEmail(form.confirmEmail);
    const currentEmail = normalizeEmail(user?.email);

    if (!isValidEmail(email)) {
      return 'Informe um e-mail valido.';
    }

    if (email !== confirmEmail) {
      return 'Os e-mails informados nao conferem.';
    }

    if (email === currentEmail) {
      return 'Informe um e-mail diferente do temporario.';
    }

    if (isTemporaryCadastroEmail(email)) {
      return 'Informe um e-mail definitivo para substituir o e-mail temporario.';
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
      await changeTemporaryEmail(normalizeEmail(form.email));
      setForm(INITIAL_FORM);
      toast.success('E-mail atualizado com sucesso.');
      onSuccess?.();
    } catch (error) {
      setMessage(error?.message || 'Nao foi possivel atualizar o e-mail.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
      <div className="mb-5">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E30613]/10 text-[#E30613]">
          <Mail className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold text-slate-950">Atualize seu e-mail</h1>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          Seu acesso foi criado com um e-mail temporario. Informe seu e-mail definitivo para continuar.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="current-email" className="text-sm font-semibold text-slate-700">
            E-mail temporario
          </label>
          <input
            id="current-email"
            type="email"
            value={user?.email || ''}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none"
            disabled
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="new-email" className="text-sm font-semibold text-slate-700">
            Novo e-mail
          </label>
          <input
            id="new-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-new-email" className="text-sm font-semibold text-slate-700">
            Confirmar novo e-mail
          </label>
          <input
            id="confirm-new-email"
            type="email"
            value={form.confirmEmail}
            onChange={(event) => setForm((current) => ({ ...current, confirmEmail: event.target.value }))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#E30613] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c80510] disabled:opacity-70"
        disabled={submitting}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar e-mail
      </button>
    </form>
  );
}
