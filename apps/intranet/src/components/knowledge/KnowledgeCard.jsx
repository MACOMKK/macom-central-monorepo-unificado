import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { Badge, Button } from '@macom/ui';
import { ChevronDown, ChevronUp, Pin, Pencil, Trash2, ThumbsUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const categoryColors = {
  geral: 'bg-gray-100 text-gray-700',
  rh: 'bg-pink-100 text-pink-700',
  ti: 'bg-blue-100 text-blue-700',
  financeiro: 'bg-green-100 text-green-700',
  vendas: 'bg-red-100 text-red-700',
  pos_vendas: 'bg-orange-100 text-orange-700',
  beneficios: 'bg-purple-100 text-purple-700',
  politicas: 'bg-amber-100 text-amber-700',
};

const typeLabels = {
  faq: 'FAQ', artigo: 'Artigo', tutorial: 'Tutorial', politica: 'Política',
};

export default function KnowledgeCard({ item, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const helpfulMutation = useMutation({
    mutationFn: () => appClient.entities.KnowledgeBase.update(item.id, { helpful_count: (item.helpful_count || 0) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  });

  const tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className={`bg-card border rounded-xl transition-all ${item.pinned ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
              <Badge variant="outline" className={`text-[10px] ${categoryColors[item.category] || ''}`}>
                {item.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{typeLabels[item.type] || item.type}</Badge>
            </div>
            <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
            {tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">#{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{item.content}</p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
            <button
              onClick={() => helpfulMutation.mutate()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Útil ({item.helpful_count || 0})</span>
            </button>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

