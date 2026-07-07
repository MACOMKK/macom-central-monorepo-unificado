export const STATUS_BADGE = {
  active: 'border-success/25 bg-success/10 text-success',
  ativo: 'border-success/25 bg-success/10 text-success',
  planned: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  admin: 'border-primary/25 bg-primary/10 text-primary',
  gestor: 'border-info/25 bg-info/10 text-info',
  usuario: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  inativo: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  default: 'border-warning/25 bg-warning/10 text-warning',
};

export function getStatusBadgeClass(status) {
  return STATUS_BADGE[status] || STATUS_BADGE.default;
}
