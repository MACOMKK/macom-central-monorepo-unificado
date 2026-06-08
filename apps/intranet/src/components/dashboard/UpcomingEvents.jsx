import React from 'react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@macom/ui';

const typeLabels = {
  reuniao: 'Reuniao',
  treinamento: 'Treinamento',
  evento: 'Evento',
  feriado: 'Feriado',
  aniversario: 'Aniversario',
  outro: 'Outro',
};

const eventImages = [
  'https://images.unsplash.com/photo-1606836591695-4d58a73eba1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBtZWV0aW5nfGVufDF8fHx8MTc3ODc5NjQ1Nnww&ixlib=rb-4.1.0&q=80&w=600',
  'https://images.unsplash.com/photo-1531058020387-3be344556be6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBldmVudCUyMHBlb3BsZXxlbnwxfHx8fDE3Nzg3NjY5ODZ8MA&ixlib=rb-4.1.0&q=80&w=600',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80',
];

function toSafeEventDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function formatEventDate(date, time) {
  if (!date) {
    return 'Data indisponivel';
  }

  const formattedDate = format(date, "d 'de' MMMM", { locale: ptBR });
  return time ? `${formattedDate}, ${time}` : formattedDate;
}

function EventCard({ title, date, image, typeLabel }) {
  return (
    <div className="group cursor-pointer overflow-hidden rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <span className="mb-1 inline-block rounded bg-primary px-2 py-1 text-xs font-semibold text-white">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="bg-white p-4">
        <h3 className="mb-1 line-clamp-1 font-semibold text-slate-800 group-hover:text-foreground">
          {title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar size={14} className="text-primary" />
          {date}
        </p>
      </div>
    </div>
  );
}

export default function UpcomingEvents() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn: () => appClient.entities.UpcomingCalendarEvent.list('date', 2),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Calendar className="text-foreground" size={20} />
          Proximos Eventos
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
          {[1, 2].map((item) => (
            <Skeleton key={item} className="h-[208px] rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">Nenhum evento proximo.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              title={event.title}
              date={formatEventDate(toSafeEventDate(event.date), event.time)}
              image={eventImages[index % eventImages.length]}
              typeLabel={typeLabels[event.type] || 'Evento'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
