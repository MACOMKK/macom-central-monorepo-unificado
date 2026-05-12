import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SearchToolbar({ onSearchChange, placeholder, search }) {
  return (
    <Card className="p-4">
      <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} />
    </Card>
  );
}
