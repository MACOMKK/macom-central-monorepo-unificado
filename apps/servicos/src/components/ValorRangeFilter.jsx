import { useEffect, useState } from 'react';

import { Input } from '@macom/ui';

// Filtro de valor por intervalo (min/max), mesmo padrao de VencimentoRangeFilter.jsx.
export default function ValorRangeFilter({ onChange, resetToken, className = '' }) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    setMin('');
    setMax('');
  }, [resetToken]);

  useEffect(() => {
    if (!min && !max) {
      onChange(null);
      return;
    }
    onChange({ min: min ? Number(min) : -Infinity, max: max ? Number(max) : Infinity });
  }, [min, max, onChange]);

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-xs text-muted-foreground">Valor (R$)</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Min"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          aria-label="Valor minimo"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Max"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          aria-label="Valor maximo"
        />
      </div>
    </div>
  );
}
