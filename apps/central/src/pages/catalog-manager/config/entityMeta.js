import { BriefcaseBusiness, Building2, FileText, Laptop, MapPinHouse, Network, Phone, UserRound } from 'lucide-react';

export const entityMeta = {
  departamentos: {
    title: 'Departamentos',
    singular: 'Departamento',
    subtitle: 'Base institucional para colaboradores e organizacao interna.',
    icon: Building2,
  },
  cargos: {
    title: 'Cargos',
    singular: 'Cargo',
    subtitle: 'Cargos vinculados aos departamentos para organizar colaboradores e permissoes futuras.',
    icon: BriefcaseBusiness,
  },
  unidades: {
    title: 'Unidades / Filiais',
    singular: 'Unidade',
    subtitle: 'Locais disponiveis para vinculo de colaboradores.',
    icon: MapPinHouse,
  },
  colaboradores: {
    title: 'Colaboradores',
    singular: 'Colaborador',
    subtitle: '',
    icon: UserRound,
  },
  contatos: {
    title: 'Contatos',
    singular: 'Contato',
    subtitle: 'Base de fornecedores e contatos externos do sistema.',
    icon: Phone,
  },
  linhas_corporativas: {
    title: 'Linhas Corporativas',
    singular: 'Linha',
    subtitle: 'Chips, linhas moveis, fixos e ramais da empresa.',
    icon: Phone,
  },
  ativos: {
    title: 'Ativos',
    singular: 'Ativo',
    subtitle: '',
    icon: Laptop,
  },
  infra_estrutura: {
    title: 'Infraestrutura',
    singular: 'Registro de Infra',
    subtitle: 'IPs e links de sistemas centralizados por unidade.',
    icon: Network,
  },
  termos_posse: {
    title: 'Termos de Posse',
    singular: 'Termo',
    subtitle: 'Geracao e acompanhamento dos termos de compromisso dos equipamentos.',
    icon: FileText,
  },
};
