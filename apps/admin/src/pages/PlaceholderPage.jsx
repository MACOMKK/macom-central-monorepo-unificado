import { Card } from '@macom/ui';

import PageHeader from '@/components/PageHeader';

export default function PlaceholderPage({ eyebrow = 'Console Macom', title, description }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Esta area ja esta reservada no Console para a proxima etapa da migracao.
        </p>
      </Card>
    </div>
  );
}
