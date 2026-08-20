import { ArrowRight } from 'lucide-react';
import { Badge } from '@macom/ui';
import { formatDataVencimento, formatValor, getVencimentoInfo } from '@/lib/financeiroFormat';

// Card usado como fallback de <Table> em telas estreitas (md:hidden) nas listagens de
// solicitacoes (MinhasSolicitacoes, Aprovacoes, Pagamentos) -- mesmo `row` da tabela, so muda a
// marcacao. `badges`/`actions` ficam a cargo de cada tela pra nao acoplar esse componente ao
// status/acoes especificas de cada uma.
export default function SolicitacaoCard({ row, onClick, showSolicitante = false, showAprovador = false, badges, actions }) {
  const vencimentoInfo = getVencimentoInfo(row.vencimento_efetivo);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick(event);
      }}
      className="space-y-2 rounded-lg border border-border bg-card p-4 active:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{row.titulo || '-'}</p>
        <p className="shrink-0 text-sm font-semibold">{formatValor(row.valor)}</p>
      </div>

      {((showSolicitante && row.solicitante_nome) || (showAprovador && row.aprovador_destino_nome)) && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {showSolicitante && row.solicitante_nome && <span className="truncate">{row.solicitante_nome}</span>}
          {showSolicitante && row.solicitante_nome && showAprovador && row.aprovador_destino_nome && (
            <ArrowRight className="h-3 w-3 shrink-0" />
          )}
          {showAprovador && row.aprovador_destino_nome && (
            <span className="truncate font-medium text-foreground">{row.aprovador_destino_nome}</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Badge variant={vencimentoInfo.variant} className="shrink-0">
          {formatDataVencimento(row.vencimento_efetivo)}
        </Badge>
        {row.fornecedor && <span>{row.fornecedor}</span>}
        {row.categoria && (
          <>
            <span>·</span>
            <span>{row.categoria}</span>
          </>
        )}
      </div>

      {badges && <div className="flex flex-wrap items-center gap-1">{badges}</div>}

      {actions && (
        <div className="flex justify-end gap-2 border-t border-border/60 pt-2" onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
