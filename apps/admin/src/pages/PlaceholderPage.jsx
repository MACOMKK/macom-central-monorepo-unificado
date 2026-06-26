import { Card } from '@macom/ui';

export default function PlaceholderPage({ eyebrow = 'MACOM Console', title, description }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Esta area ja esta reservada no Console para a proxima etapa da migracao.
        </p>
      </Card>
    </div>
  );
}
