import { Building2, MapPin, Pencil, Phone, Trash2, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function formatCnpj(cnpj) {
  if (!cnpj) return 'CNPJ nao informado';
  const digits = String(cnpj).replace(/\D/g, '');

  if (digits.length !== 14) return cnpj;

  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export default function UnitCardsGrid({
  assetsByUnitId = {},
  canManage = true,
  collaboratorsByUnitId = {},
  formatPhone,
  onDelete,
  onEdit,
  units,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {units.map((unit) => {
        const assetsCount = assetsByUnitId[unit.id] || 0;
        const collaboratorsCount = collaboratorsByUnitId[unit.id] || 0;

        return (
          <Card key={unit.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="h-1.5 bg-[#d1131f]" />
            <div className="p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8eb] text-[#d1131f]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold leading-tight text-foreground">{unit.nome}</h3>
                    <p className="text-[13px] text-muted-foreground">{unit.cidade || 'Cidade nao informada'}</p>
                    <p className="text-[12px] text-muted-foreground">{formatCnpj(unit.cnpj)}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={unit.ativo ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-zinc-200 bg-zinc-100 text-zinc-700'}
                >
                  {unit.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="space-y-2 text-[14px] text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{unit.endereco || 'Endereco nao informado'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{formatPhone(unit.telefone)}</span>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{unit.responsavel || 'Responsavel nao informado'}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-[#d1131f]">{assetsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Ativos</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-foreground">{collaboratorsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Colaboradores</p>
                </div>
              </div>

              {canManage ? (
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" className="h-10 flex-1 gap-2 rounded-xl" onClick={() => onEdit(unit)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-[#ff4b4b] hover:bg-red-50 hover:text-[#ff4b4b]"
                    onClick={() => onDelete(unit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
