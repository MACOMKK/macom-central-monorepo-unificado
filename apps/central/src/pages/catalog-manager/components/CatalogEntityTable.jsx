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

const SELECTION_LABELS_BY_ENTITY = {
  ativos: 'ativo',
  colaboradores: 'colaborador',
  contatos: 'contato',
  infra_estrutura: 'infraestrutura',
  linhas_corporativas: 'linha corporativa',
};

export default function CatalogEntityTable({
  allRowsSelected = false,
  canManage = true,
  columns,
  entityKey,
  isLoading,
  onDelete,
  onEdit,
  onRowClick,
  onToggleAllRows,
  onToggleRowSelection,
  rows,
  selectedRowIds = [],
  toggleRowMenu,
}) {
  const menuType = MENU_TYPES_BY_ENTITY[entityKey];
  const isCenteredActions = Boolean(menuType);
  const isCollaborators = entityKey === 'colaboradores';
  const showSelection = canManage && Boolean(SELECTION_LABELS_BY_ENTITY[entityKey]);
  const selectionLabel = SELECTION_LABELS_BY_ENTITY[entityKey];
  const colSpan = columns.length + (canManage ? 1 : 0) + (showSelection ? 1 : 0);

  return (
    <CatalogTableShell
      allRowsSelected={allRowsSelected}
      columns={columns}
      entityKey={entityKey}
      onToggleAllRows={onToggleAllRows}
      selectionLabel={selectionLabel}
      showActions={canManage}
      showSelection={showSelection}
    >
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={colSpan} className="py-12 text-center text-muted-foreground">
            Carregando...
          </TableCell>
        </TableRow>
      ) : rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={colSpan} className="py-12 text-center text-muted-foreground">
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
            {showSelection ? (
              <TableCell onClick={(event) => event.stopPropagation()}>
                <input
                  aria-label={`Selecionar ${selectionLabel} ${row.nome || row.numero || row.id}`}
                  checked={selectedRowIds.includes(row.id)}
                  onChange={(event) => onToggleRowSelection?.(row.id, event.target.checked)}
                  type="checkbox"
                />
              </TableCell>
            ) : null}
            {columns.map((column) => (
              <TableCell key={`${row.id}-${column.key}`} className={isCollaborators ? 'py-3 text-[14px]' : ''}>
                {column.render ? column.render(row[column.key], row) : row[column.key] || '-'}
              </TableCell>
            ))}
            {canManage ? (
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
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))
      )}
    </CatalogTableShell>
  );
}
