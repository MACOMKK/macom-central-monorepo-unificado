import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import CatalogTableShell from '@/pages/catalog-manager/components/CatalogTableShell';
import MenuTriggerButton from '@/pages/catalog-manager/components/MenuTriggerButton';

const MENU_TYPES_BY_ENTITY = {
  ativos: 'asset',
  colaboradores: 'collaborator',
  contatos: 'contact',
  infra_estrutura: 'infrastructure',
  linhas_corporativas: 'corporateLine',
};

export default function CatalogEntityTable({
  columns,
  entityKey,
  isLoading,
  onDelete,
  onEdit,
  onRowClick,
  rows,
  toggleRowMenu,
}) {
  const menuType = MENU_TYPES_BY_ENTITY[entityKey];
  const isCenteredActions = Boolean(menuType);
  const isCollaborators = entityKey === 'colaboradores';

  return (
    <CatalogTableShell columns={columns} entityKey={entityKey}>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={columns.length + 1} className="py-12 text-center text-muted-foreground">
            Carregando...
          </TableCell>
        </TableRow>
      ) : rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={columns.length + 1} className="py-12 text-center text-muted-foreground">
            Nenhum registro encontrado
          </TableCell>
        </TableRow>
      ) : (
        rows.map((row) => (
          <TableRow
            key={row.id}
            className={`transition-colors hover:bg-muted/30 ${isCollaborators ? 'cursor-pointer' : ''}`}
            onClick={isCollaborators ? () => onRowClick?.(row) : undefined}
          >
            {columns.map((column) => (
              <TableCell key={`${row.id}-${column.key}`} className={isCollaborators ? 'py-3 text-[14px]' : ''}>
                {column.render ? column.render(row[column.key], row) : row[column.key] || '-'}
              </TableCell>
            ))}
            <TableCell
              className={isCenteredActions ? 'text-center' : 'text-right'}
              onClick={isCenteredActions ? (event) => event.stopPropagation() : undefined}
            >
              <div className={isCenteredActions ? 'flex justify-center gap-1' : 'flex justify-end gap-1'}>
                {menuType ? (
                  <MenuTriggerButton onClick={(event) => toggleRowMenu(event, row, menuType)} />
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))
      )}
    </CatalogTableShell>
  );
}
