import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@macom/ui';

export default function QueryState({
  isLoading,
  isError,
  isEmpty,
  loadingLabel = 'Carregando...',
  emptyLabel = 'Nenhum registro encontrado.',
  errorLabel = 'Nao foi possivel carregar os dados. Tente novamente.',
  children,
}) {
  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{loadingLabel}</p>;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar</AlertTitle>
        <AlertDescription>{errorLabel}</AlertDescription>
      </Alert>
    );
  }

  if (isEmpty) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return children;
}
