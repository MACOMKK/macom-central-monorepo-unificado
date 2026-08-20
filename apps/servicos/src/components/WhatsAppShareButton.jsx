import { WhatsAppIcon } from '@macom/ui';

import { formatDataVencimento, formatValor, FORMA_PAGAMENTO_LABEL, STATUS_LABEL } from '@/lib/financeiroFormat';

// Monta o link de deep-link pra solicitacao (rota universal /solicitacoes, que resolve pra
// qualquer papel -- financeiro ve tudo, aprovador ve as suas + as endereçadas a ele, usuario so
// as proprias) e abre o wa.me ja com a mensagem preenchida. Usa a formatacao de texto que o
// proprio WhatsApp entende (*negrito*) pra ficar organizado em vez de um bloco de texto corrido.
// Sem emoji/simbolos de proposito: quebraram (viraram "?") no cliente do usuario mesmo os do
// plano basico do Unicode -- provavelmente falta de fonte de emoji no ambiente dele, nao da pra
// garantir que rendericem em qualquer SO/cliente WhatsApp.
function buildWhatsAppUrl(solicitacao) {
  const link = `${window.location.origin}/solicitacoes?sol=${solicitacao.id}`;
  const titulo = solicitacao.titulo?.trim();

  const linhas = [
    `*Solicitação de Pagamento${titulo ? ` — ${titulo}` : ''}*`,
    '',
    solicitacao.fornecedor && `*Fornecedor:* ${solicitacao.fornecedor}`,
    `*Valor:* ${formatValor(solicitacao.valor)}`,
    solicitacao.categoria && `*Categoria:* ${solicitacao.categoria}`,
    solicitacao.vencimento_efetivo && `*Vencimento:* ${formatDataVencimento(solicitacao.vencimento_efetivo)}`,
    solicitacao.forma_pagamento &&
      `*Forma de pagamento:* ${FORMA_PAGAMENTO_LABEL[solicitacao.forma_pagamento] || solicitacao.forma_pagamento}`,
    solicitacao.status && `*Status:* ${STATUS_LABEL[solicitacao.status] || solicitacao.status}`,
    '',
    `Ver solicitação: ${link}`,
  ].filter((linha) => linha !== null && linha !== undefined && linha !== false);

  return `https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`;
}

export default function WhatsAppShareButton({ solicitacao, className = '' }) {
  if (!solicitacao) return null;

  return (
    <a
      href={buildWhatsAppUrl(solicitacao)}
      target="_blank"
      rel="noopener noreferrer"
      title="Compartilhar via WhatsApp"
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-emerald-600 ${className}`}
    >
      <WhatsAppIcon className="h-4 w-4" />
      <span className="sr-only">Compartilhar via WhatsApp</span>
    </a>
  );
}
