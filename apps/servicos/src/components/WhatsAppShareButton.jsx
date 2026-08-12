import { formatData, formatValor, FORMA_PAGAMENTO_LABEL, STATUS_LABEL } from '@/lib/financeiroFormat';

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.472-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.003 2C6.478 2 2 6.477 2 12c0 1.892.526 3.658 1.44 5.166L2 22l4.955-1.412A9.936 9.936 0 0 0 12.003 22C17.527 22 22 17.523 22 12S17.527 2 12.003 2zm0 18.09a8.06 8.06 0 0 1-4.354-1.264l-.312-.186-2.94.838.842-2.868-.203-.313A8.06 8.06 0 1 1 20.06 12a8.07 8.07 0 0 1-8.057 8.09z" />
    </svg>
  );
}

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
    solicitacao.data_vencimento && `*Vencimento:* ${formatData(solicitacao.data_vencimento)}`,
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
