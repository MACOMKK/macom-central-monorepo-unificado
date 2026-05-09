import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CatalogTableShell({ children, columns, entityKey }) {
  const isCenteredActionsHeader =
    entityKey === 'colaboradores' ||
    entityKey === 'ativos' ||
    entityKey === 'contatos' ||
    entityKey === 'linhas_corporativas' ||
    entityKey === 'infra_estrutura';

  return (
    <Card className="overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead key={column.key} className={entityKey === 'colaboradores' ? 'text-[13px] font-semibold' : 'font-bold'}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className={isCenteredActionsHeader ? 'text-center text-[13px] font-semibold' : 'text-right font-bold'}>
                Acoes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
    </Card>
  );
}
