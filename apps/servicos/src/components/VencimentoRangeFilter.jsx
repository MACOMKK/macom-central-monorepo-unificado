import { useEffect, useState } from 'react';

import { Input } from '@macom/ui';

// Filtro de vencimento por intervalo (De - Ate). Dois campos de data em vez de slider --
// com muitas datas espalhadas no dataset um slider fica impreciso pra escolher um dia exato,
// enquanto digitar/selecionar a data direto e sempre igual de rapido.
export default function VencimentoRangeFilter({ onChange, resetToken, className = '' }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setFrom('');
    setTo('');
  }, [resetToken]);

  useEffect(() => {
    if (!from && !to) {
      onChange(null);
      return;
    }
    onChange({ from: from || '0001-01-01', to: to || '9999-12-31' });
  }, [from, to, onChange]);

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-xs text-muted-foreground">Vencimento</span>
      <div className="flex items-center gap-2">
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Vencimento de" />
        <span className="text-xs text-muted-foreground">até</span>
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Vencimento ate" />
      </div>
    </div>
  );
}
