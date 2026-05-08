import { Card } from '@/components/ui/card';

export default function StatsCard({ title, value, icon: Icon, color, subtitle, iconClassName = 'text-primary' }) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lg">
      <div className={`absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full opacity-10 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className={`rounded-xl p-2.5 ${color} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${iconClassName}`} />
        </div>
      </div>
    </Card>
  );
}
