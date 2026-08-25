import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { useToast } from '@macom/ui';

// Botao generico de "copiar para a area de transferencia" -- usado ao lado de nomes/valores
// exibidos como texto puro (tabelas, cards, drawers) pra nao precisar selecionar o texto na mao.
export default function CopyButton({ value, label = 'Copiar', className = '' }) {
  const { toast } = useToast();
  const [copiado, setCopiado] = useState(false);

  async function handleCopy(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (error) {
      toast({ title: 'Não foi possível copiar', description: error.message });
    }
  }

  if (!value) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`shrink-0 text-muted-foreground hover:text-foreground ${className}`}
      title={label}
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
