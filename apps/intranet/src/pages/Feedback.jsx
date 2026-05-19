import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Send, Loader2, CheckCircle2, Clock, ArchiveX, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@macom/ui';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/lib/usePermissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const typeConfig = {
  sugestao:   { label: 'Sugestão',   class: 'bg-blue-100 text-blue-700' },
  feedback:   { label: 'Feedback',   class: 'bg-purple-100 text-purple-700' },
  reclamacao: { label: 'Reclamação', class: 'bg-red-100 text-red-700' },
  elogio:     { label: 'Elogio',     class: 'bg-green-100 text-green-700' },
};

const statusConfig = {
  pendente:   { label: 'Pendente',    icon: Clock,        class: 'bg-yellow-100 text-yellow-700' },
  em_analise: { label: 'Em Análise',  icon: Loader2,      class: 'bg-blue-100 text-blue-700' },
  concluido:  { label: 'Concluído',   icon: CheckCircle2, class: 'bg-green-100 text-green-700' },
  arquivado:  { label: 'Arquivado',   icon: ArchiveX,     class: 'bg-gray-100 text-gray-600' },
};

const categoryLabels = {
  geral: 'Geral', rh: 'RH', ti: 'TI', financeiro: 'Financeiro',
  vendas: 'Vendas', pos_vendas: 'Pós-Vendas', infraestrutura: 'Infraestrutura', gestao: 'Gestão',
};

const EMPTY_FORM = { type: 'sugestao', category: 'geral', title: '', content: '', anonymous: false };

function FeedbackCard({ item, isAdmin, onStatusChange, onRespond }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(item.admin_response || '');
  const [saving, setSaving] = useState(false);
  const tc = typeConfig[item.type] || typeConfig.sugestao;
  const sc = statusConfig[item.status] || statusConfig.pendente;
  const StatusIcon = sc.icon;

  const handleRespond = async () => {
    setSaving(true);
    await onRespond(item.id, response);
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-[10px] ${tc.class}`}>{tc.label}</Badge>
            <Badge className={`text-[10px] ${sc.class} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" /> {sc.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{categoryLabels[item.category] || item.category}</Badge>
          </div>
          <h3 className="font-semibold text-sm">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.anonymous ? 'Anônimo' : (item.created_by || 'Usuário')} ·{' '}
            {format(new Date(item.created_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">{item.content}</p>

          {item.admin_response && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary mb-1">Resposta da Administração:</p>
              <p className="text-sm">{item.admin_response}</p>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex gap-2">
                <Select value={item.status} onValueChange={v => onStatusChange(item.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Escreva uma resposta para o autor..."
                value={response}
                onChange={e => setResponse(e.target.value)}
                className="text-sm h-20"
              />
              <Button size="sm" onClick={handleRespond} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Enviar Resposta
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Feedback() {
  const { role } = usePermissions(null);
  const isAdmin = role === 'admin';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => appClient.entities.Feedback.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Feedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      setForm(EMPTY_FORM);
      toast.success('Feedback enviado com sucesso!');
      setSubmitting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Feedback.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedbacks'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    createMutation.mutate(form);
  };

  const handleStatusChange = (id, status) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleRespond = async (id, admin_response) => {
    await updateMutation.mutateAsync({ id, data: { admin_response, status: 'concluido' } });
    toast.success('Resposta enviada!');
  };

  const filtered = feedbacks.filter(f => {
    const matchType = filterType === 'all' || f.type === filterType;
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <MessageSquarePlus className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Feedback & Sugestões</h1>
          <p className="text-sm text-muted-foreground">Compartilhe ideias, melhorias ou elogios com a equipe</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Enviar Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              placeholder="Resumo do seu feedback..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva com detalhes sua sugestão ou feedback..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="h-28"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="anon"
                checked={form.anonymous}
                onCheckedChange={v => setForm(f => ({ ...f, anonymous: v }))}
              />
              <Label htmlFor="anon" className="cursor-pointer">Enviar anonimamente</Label>
            </div>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </Button>
          </div>
        </form>
      </div>

      {/* List */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="sugestao">Sugestão</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="reclamacao">Reclamação</SelectItem>
                <SelectItem value="elogio">Elogio</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquarePlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum feedback encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <FeedbackCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
                onRespond={handleRespond}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

