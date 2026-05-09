import { Search } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssetsToolbar({
  assetCategoryFilter,
  assetStatusFilter,
  assetUnitFilter,
  categoryOptions,
  importInputRef,
  onAssetCategoryFilterChange,
  onAssetStatusFilterChange,
  onAssetUnitFilterChange,
  onImportAssetsFile,
  onSearchChange,
  search,
  searchPlaceholder,
  units,
}) {
  return (
    <Card className="rounded-2xl p-3 shadow-sm">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv,.json,application/json"
        className="hidden"
        onChange={onImportAssetsFile}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-lg pl-10 text-[13px]"
          />
        </div>

        <Select value={assetStatusFilter} onValueChange={onAssetStatusFilterChange}>
          <SelectTrigger className="h-9 rounded-lg text-[13px]">
            <SelectValue placeholder="Todos Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="disponivel">Disponivel</SelectItem>
            <SelectItem value="em_uso">Em uso</SelectItem>
            <SelectItem value="manutencao">Manutencao</SelectItem>
            <SelectItem value="descartado">Descartado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assetCategoryFilter} onValueChange={onAssetCategoryFilterChange}>
          <SelectTrigger className="h-9 rounded-lg text-[13px]">
            <SelectValue placeholder="Todas Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assetUnitFilter} onValueChange={onAssetUnitFilterChange}>
          <SelectTrigger className="h-9 rounded-lg text-[13px]">
            <SelectValue placeholder="Todas Unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Unidades</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
