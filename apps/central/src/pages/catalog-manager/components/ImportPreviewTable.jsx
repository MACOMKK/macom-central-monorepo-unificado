export default function ImportPreviewTable({ columns, rows }) {
  if (!rows.length) return null;

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Preview antes de importar</p>
        <span className="text-xs text-muted-foreground">{rows.length} linha(s) encontrada(s)</span>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, index) => (
              <tr key={`${index}-${row.email || row.nome || row.patrimonio || 'preview'}`} className="border-t">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-muted-foreground">
                    {row[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 ? <p className="text-xs text-muted-foreground">Mostrando as 5 primeiras linhas para conferencia.</p> : null}
    </div>
  );
}
