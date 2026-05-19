import React from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Skeleton } from '@macom/ui';

const typeLabels = {
  reuniao: 'Reunião',
  treinamento: 'Treinamento',
  evento: 'Evento',
  feriado: 'Feriado',
  aniversario: 'Aniversário',
  outro: 'Outro',
};

// Placeholder images per event type
const eventImages = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80',
];

function toSafeEventDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export default function UpcomingEvents() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn: async () => {
      const all = await appClient.entities.CalendarEvent.list('date', 50);
      return all
        .filter((event) => typeof event?.date === 'string' && event.date >= today)
        .slice(0, 4);
    },
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Próximos Eventos</h2>
        </div>
        <Link to="/calendario" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2].map(i => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento próximo.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {events.map((e, idx) => {
            const eventDate = toSafeEventDate(e.date);
            const imgUrl = eventImages[idx % eventImages.length];
            return (
              <div key={e.id} className="rounded-xl overflow-hidden border border-border bg-muted/20">
                {/* Image */}
                <div className="relative h-28 overflow-hidden">
                  <img src={imgUrl} alt={e.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-xs font-bold text-white bg-primary px-2 py-0.5 rounded-md">
                    {typeLabels[e.type] || 'Evento'}
                  </span>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold leading-tight truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                    <CalendarDays className="w-3 h-3 text-orange-400" />
                    {eventDate ? format(eventDate, "d 'de' MMMM", { locale: ptBR }) : 'Data indisponivel'}
                    {e.time && `, ${e.time}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

