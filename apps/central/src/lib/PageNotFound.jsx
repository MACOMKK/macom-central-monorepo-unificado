import { NotFoundPage } from '@macom/ui';
import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1) || 'inicio';

  return (
    <NotFoundPage
      highlightedPath={pageName}
      message="Encontramos um veiculo avariado no caminho. A rota"
      title="Rota fora de servico"
    />
  );
}
