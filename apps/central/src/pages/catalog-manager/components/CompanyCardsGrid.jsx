import { Landmark, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CompanyCardsGrid({
  canManage = true,
  collaboratorsByCompanyId = {},
  companies,
  onDelete,
  onEdit,
  unitsByCompanyId = {},
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => {
        const collaboratorsCount = collaboratorsByCompanyId[company.id] || 0;
        const unitsCount = unitsByCompanyId[company.id] || 0;

        return (
          <Card key={company.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="h-1.5 bg-[#d1131f]" />
            <div className="p-5">
              <div className="mb-3 flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8eb] text-[#d1131f]">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold leading-tight text-foreground">{company.nome}</h3>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-foreground">{unitsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Unidades</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-foreground">{collaboratorsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Colaboradores</p>
                </div>
              </div>

              {canManage ? (
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" className="h-10 flex-1 gap-2 rounded-xl" onClick={() => onEdit(company)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-[#ff4b4b] hover:bg-red-50 hover:text-[#ff4b4b]"
                    onClick={() => onDelete(company)}
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
