import { useMemo, useState } from 'react';
import { localCrmDb } from '@/api/localCrmDb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useEmpresa } from '@/context/EmpresaContext';
import { cn } from '@/lib/utils';
import { Building2, Car, Clock3, History, Mail, Pencil, Phone, Save, Search, Tag, UserRound, X } from 'lucide-react';

const EMPRESAS = ['Macom Ananindeua', 'Macom BelÃ©m', 'Macom Paragominas'];

const STATUS_LABEL = {
  lead: 'Lead',
  cliente: 'Cliente',
  pos_venda: 'Pos-venda',
};

const STATUS_STYLE = {
  lead: 'border-blue-200 bg-blue-50 text-blue-700',
  cliente: 'border-green-200 bg-green-50 text-green-700',
  pos_venda: 'border-amber-200 bg-amber-50 text-amber-700',
};

const LEAD_STATUS_LABEL = {
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

const LEAD_STATUS_STYLE = {
  novo: 'border-blue-200 bg-blue-50 text-blue-700',
  em_atendimento: 'border-amber-200 bg-amber-50 text-amber-700',
  convertido: 'border-green-200 bg-green-50 text-green-700',
  perdido: 'border-red-200 bg-red-50 text-red-700',
};

const ACTIVE_LEAD_STATUSES = new Set(['novo', 'em_atendimento']);

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => localCrmDb.entities.Cliente.list('-updated_date', 500),
  });

  const { data: historico = [] } = useQuery({
    queryKey: ['historico-atendimento'],
    queryFn: () => localCrmDb.entities.HistoricoAtendimento.list('-created_date', 1000),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => localCrmDb.entities.Lead.list('-created_date', 1000),
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => localCrmDb.entities.Evento.list('-created_date', 1000),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const matchEmpresa = empresa === 'Todas' || cliente.empresa === empresa;
      const clienteLeads = leads.filter((lead) => (
        lead.cliente_id === cliente.id || lead.telefone_normalizado === cliente.telefone_normalizado
      ));
      const matchBusca = !termo || [
        cliente.nome,
        cliente.telefone,
        cliente.email,
        ...clienteLeads.flatMap((lead) => [lead.modelo_interesse, lead.origem]),
      ].some((value) => String(value || '').toLowerCase().includes(termo));

      return matchEmpresa && matchBusca;
    });
  }, [busca, clientes, empresa, leads]);

  const selectedHistorico = historico.filter((item) => item.cliente_id === selected?.id);
  const selectedLeads = leads.filter((lead) => (
    lead.cliente_id === selected?.id || lead.telefone_normalizado === selected?.telefone_normalizado
  ));
  const selectedAtendimentos = atendimentos.filter((atendimento) => (
    atendimento.cliente_id === selected?.id || atendimento.telefone_normalizado === selected?.telefone_normalizado
  ));
  const activeLead = selectedLeads.find((lead) => ACTIVE_LEAD_STATUSES.has(lead.status));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => localCrmDb.entities.Cliente.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-atendimento'] });
      setSelected(updated);
      setFormData(updated);
      setEditing(false);
      toast({
        title: 'Cliente atualizado',
        description: 'As informacoes do cliente foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Nao foi possivel atualizar o cliente',
        description: error.message || 'Revise os dados informados.',
        variant: 'destructive',
      });
    },
  });

  function openCliente(cliente) {
    setSelected(cliente);
    setFormData(cliente);
    setEditing(false);
  }

  function closeCliente() {
    setSelected(null);
    setFormData(null);
    setEditing(false);
  }

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function saveCliente(event) {
    event.preventDefault();
    updateMutation.mutate({
      id: selected.id,
      data: formData,
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">Clientes</h1>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
            Cadastro central e historico comercial
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar cliente..."
            className="h-9 w-64 rounded-none bg-white pl-9 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1a1a1a] hover:bg-[#1a1a1a]">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white">Cliente</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white">Contato</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white">Lead ativo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white">Unidade</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white">Status</TableHead>
              <TableHead className="w-32 text-right text-[10px] font-bold uppercase tracking-widest text-white">Historico</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : filtrados.map((cliente, index) => {
              const totalHistorico = historico.filter((item) => item.cliente_id === cliente.id).length;
              const clienteLeads = leads.filter((lead) => (
                lead.cliente_id === cliente.id || lead.telefone_normalizado === cliente.telefone_normalizado
              ));
              const leadAtivoLinha = clienteLeads.find((lead) => ACTIVE_LEAD_STATUSES.has(lead.status));

              return (
                <TableRow
                  key={cliente.id}
                  className={cn('cursor-pointer hover:bg-red-50', index % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]')}
                  onClick={() => openCliente(cliente)}
                >
                  <TableCell>
                    <div className="font-bold text-sm">{cliente.nome}</div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">cadastro do cliente</div>
                  </TableCell>
                  <TableCell className="space-y-1 text-xs">
                    {cliente.telefone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{cliente.telefone}</div> : null}
                    {cliente.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{cliente.email}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs">
                    {leadAtivoLinha ? (
                      <div>
                        <div className="font-semibold">{leadAtivoLinha.modelo_interesse || 'Modelo nao informado'}</div>
                        <div className="mt-0.5 uppercase tracking-wider text-muted-foreground">{leadAtivoLinha.origem || 'sem origem'}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem lead ativo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{cliente.empresa}</TableCell>
                  <TableCell>
                    <Badge className={cn('rounded-sm border text-[10px] uppercase tracking-wider', STATUS_STYLE[cliente.status_relacionamento] || STATUS_STYLE.lead)}>
                      {STATUS_LABEL[cliente.status_relacionamento] || 'Lead'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" className="h-8 rounded-none text-xs font-bold uppercase tracking-wider">
                      {totalHistorico} itens
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && closeCliente()}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="bg-[#1a1a1a] px-6 py-5">
            <SheetTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
              <UserRound className="h-4 w-4 text-primary" />
              Historico do Cliente
            </SheetTitle>
          </SheetHeader>

          {selected ? (
            <div className="space-y-5 p-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-widest">{selected.nome}</h2>
                    <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                      {selected.telefone ? <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{selected.telefone}</span> : null}
                      {selected.email ? <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{selected.email}</span> : null}
                      <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{selected.empresa}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={editing ? 'outline' : 'default'}
                    className="h-9 rounded-none text-xs font-bold uppercase tracking-wider"
                    onClick={() => {
                      setEditing((current) => !current);
                      setFormData(selected);
                    }}
                  >
                    {editing ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Pencil className="mr-1.5 h-3.5 w-3.5" />}
                    {editing ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
              </div>

              {editing ? (
                <form onSubmit={saveCliente} className="border-t pt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dados do cliente</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome *</Label>
                      <Input required value={formData?.nome || ''} onChange={(event) => updateField('nome', event.target.value)} className="h-9 rounded-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone *</Label>
                      <Input required value={formData?.telefone || ''} onChange={(event) => updateField('telefone', event.target.value)} className="h-9 rounded-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</Label>
                      <Input type="email" value={formData?.email || ''} onChange={(event) => updateField('email', event.target.value)} className="h-9 rounded-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unidade</Label>
                      <Select value={formData?.empresa || 'Macom Ananindeua'} onValueChange={(value) => updateField('empresa', value)}>
                        <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-none">{EMPRESAS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                      <Select value={formData?.status_relacionamento || 'lead'} onValueChange={(value) => updateField('status_relacionamento', value)}>
                        <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="pos_venda">Pos-venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observacoes gerais</Label>
                      <Textarea value={formData?.observacoes || ''} onChange={(event) => updateField('observacoes', event.target.value)} className="resize-none rounded-none text-sm" rows={3} />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" disabled={updateMutation.isPending} className="h-9 rounded-none text-xs font-bold uppercase tracking-wider">
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Salvar Cliente
                    </Button>
                  </div>
                </form>
              ) : null}

              <Tabs defaultValue="visao" className="border-t pt-5">
                <TabsList className="grid h-auto w-full grid-cols-4 rounded-none bg-slate-100 p-1">
                  <TabsTrigger value="visao" className="rounded-none text-[10px] font-bold uppercase tracking-widest">Resumo</TabsTrigger>
                  <TabsTrigger value="leads" className="rounded-none text-[10px] font-bold uppercase tracking-widest">Leads</TabsTrigger>
                  <TabsTrigger value="atendimentos" className="rounded-none text-[10px] font-bold uppercase tracking-widest">Atend.</TabsTrigger>
                  <TabsTrigger value="historico" className="rounded-none text-[10px] font-bold uppercase tracking-widest">Linha</TabsTrigger>
                </TabsList>

                <TabsContent value="visao" className="mt-4 space-y-4">
                  {activeLead ? (
                    <div className="border-l-4 border-blue-600 bg-blue-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Lead ativo</p>
                        <Badge className={cn('rounded-sm border text-[10px] uppercase tracking-wider', LEAD_STATUS_STYLE[activeLead.status])}>
                          {LEAD_STATUS_LABEL[activeLead.status]}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold">{activeLead.modelo_interesse || 'Modelo nao informado'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Origem: {activeLead.origem || '-'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Criado em: {formatDate(activeLead.created_date)}</p>
                    </div>
                  ) : (
                    <div className="border border-dashed py-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Nenhum lead ativo
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leads</p>
                      <p className="mt-1 text-2xl font-black">{selectedLeads.length}</p>
                    </div>
                    <div className="bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atend.</p>
                      <p className="mt-1 text-2xl font-black">{selectedAtendimentos.length}</p>
                    </div>
                    <div className="bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historico</p>
                      <p className="mt-1 text-2xl font-black">{selectedHistorico.length}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="leads" className="mt-4">
                  {selectedLeads.length === 0 ? (
                    <div className="border border-dashed py-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Nenhum lead registrado
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedLeads.map((lead) => (
                        <div key={lead.id} className="bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                              <Tag className="h-3 w-3" />
                              Lead
                            </span>
                            <Badge className={cn('rounded-sm border text-[10px] uppercase tracking-wider', LEAD_STATUS_STYLE[lead.status] || LEAD_STATUS_STYLE.novo)}>
                              {LEAD_STATUS_LABEL[lead.status] || lead.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold">{lead.modelo_interesse || 'Modelo nao informado'}</p>
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <span>Origem: {lead.origem || '-'}</span>
                            <span>Criado em: {formatDate(lead.created_date)}</span>
                            {lead.convertido_em ? <span>Convertido em: {formatDate(lead.convertido_em)}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="atendimentos" className="mt-4">
                  {selectedAtendimentos.length === 0 ? (
                    <div className="border border-dashed py-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Nenhum atendimento registrado
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedAtendimentos.map((atendimento) => (
                        <div key={atendimento.id} className="border-l-4 border-primary bg-white p-4 shadow-sm">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{atendimento.tipo_evento || 'atendimento'}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{atendimento.status}</span>
                          </div>
                          <p className="text-sm font-bold">{atendimento.titulo}</p>
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <span>Origem: {atendimento.origem || '-'}</span>
                            {atendimento.proximo_contato ? <span>Proximo contato: {formatDate(`${atendimento.proximo_contato}T00:00:00`)}</span> : null}
                            <span>Criado em: {formatDate(atendimento.created_date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                  {selectedHistorico.length === 0 ? (
                    <div className="border border-dashed py-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Nenhum historico registrado
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedHistorico.map((item) => (
                        <div key={item.id} className="border-l-4 border-primary bg-white p-4 shadow-sm">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                              <History className="h-3 w-3" />
                              {item.tipo}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              {formatDate(item.created_date)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold">{item.descricao}</p>
                          {item.status ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Status: {item.status}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
