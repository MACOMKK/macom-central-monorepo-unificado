export function useCatalogPasswordActions({
  generatePassword,
  mutatePassword,
  navigatorClipboard,
  passwordForm,
  passwordRecord,
  setFeedback,
  setPasswordForm,
}) {
  const handleGeneratePassword = async () => {
    const nextPassword = generatePassword();
    setPasswordForm({ password: nextPassword, confirmPassword: nextPassword });
    try {
      await navigatorClipboard.writeText(nextPassword);
      setFeedback({ type: 'success', message: 'Senha gerada e copiada.' });
    } catch {
      setFeedback({ type: 'success', message: 'Senha gerada com sucesso.' });
    }
  };

  const handleCopyPassword = async () => {
    if (!passwordForm.password) return;
    try {
      await navigatorClipboard.writeText(passwordForm.password);
      setFeedback({ type: 'success', message: 'Senha copiada.' });
    } catch {
      setFeedback({ type: 'error', message: 'Nao foi possivel copiar a senha.' });
    }
  };

  const handleSubmitPassword = () => {
    if (!passwordRecord?.id) return;
    if (!passwordForm.password || passwordForm.password.length < 6) {
      setFeedback({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'As senhas nao conferem.' });
      return;
    }
    mutatePassword({ id: passwordRecord.id, password: passwordForm.password });
  };

  return {
    handleCopyPassword,
    handleGeneratePassword,
    handleSubmitPassword,
  };
}
