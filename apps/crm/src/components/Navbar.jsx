import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  ChevronDown,
  Columns3,
  DollarSign,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Lock,
  LogOut,
  PieChart,
  Settings,
  SlidersHorizontal,
  Tag,
  Users,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEmpresa } from '@/context/EmpresaContext';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const EMPRESAS = ['Todas', 'Macom Ananindeua', 'Macom Belém', 'Macom Paragominas'];
const MACOM_LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

function NavMenu({ label, items }) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-full items-center gap-1 border-b-2 border-transparent px-3 text-xs font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-primary hover:text-white data-[state=open]:border-primary data-[state=open]:text-white">
        {label} <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-none border-0 p-0 shadow-2xl">
        <div className="border-b border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white">
          {label}
        </div>
        {items ? items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={!item.path}
            className={cn(
              'gap-3 rounded-none px-4 py-3 text-xs font-semibold uppercase tracking-wider',
              item.path
                ? 'cursor-pointer hover:bg-red-50 hover:text-primary focus:bg-red-50 focus:text-primary'
                : 'cursor-not-allowed text-slate-400 opacity-70 focus:bg-transparent',
            )}
            onClick={() => item.path && navigate(item.path)}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm',
                item.path ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400',
              )}
            >
              {item.path ? <item.icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </span>
            {item.label}
            {!item.path ? <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-slate-400">Sem acesso</span> : null}
          </DropdownMenuItem>
        )) : (
          <div className="flex flex-col items-center bg-white px-4 py-8 text-center">
            <Lock className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sem acesso aos modulos</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Contate um administrador</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { empresa, setEmpresa } = useEmpresa();
  const { logout, user } = useAuth();
  const userInitial = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <header className="bg-[#1a1a1a] px-6">
      <div className="flex h-14 items-center">
        <Link to="/leads" className="mr-6 flex shrink-0 items-center">
          <img src={MACOM_LOGO_URL} alt="MACOM" className="h-8 w-8 object-contain" />
          <span className="ml-2 text-sm font-black uppercase tracking-widest text-white">MACOM</span>
          <span className="mx-2 text-white/30">|</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">REVVO CRM</span>
        </Link>

        <nav className="hidden h-full items-center md:flex">
          <NavMenu label="Vendas" items={[
            { label: 'Atendimentos', icon: Tag, path: '/atendimentos' },
            { label: 'Leads', icon: DollarSign, path: '/leads' },
            { label: 'Clientes', icon: Users, path: '/clientes' },
            { label: 'Estoque', icon: Columns3 },
            { label: 'Recepção', icon: Headphones },
          ]} />
          <NavMenu label="Pós-Vendas" items={[
            { label: 'Atendimentos', icon: Tag, path: '/atendimentos' },
            { label: 'Leads', icon: DollarSign, path: '/leads' },
            { label: 'Agenda Online', icon: Calendar },
            { label: 'Agenda V2', icon: CalendarDays },
            { label: 'Painel de Retenção', icon: PieChart },
          ]} />
          <NavMenu label="Marketing" items={null} />
          <NavMenu label="Gestão" items={[
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
            { label: 'Clientes', icon: Users, path: '/clientes' },
            { label: "KPI's", icon: BarChart3 },
            { label: 'Treinamentos', icon: GraduationCap },
          ]} />
          <NavMenu label="Configurações" items={[
            { label: 'Funil', icon: SlidersHorizontal },
            { label: 'Etapas do Funil', icon: SlidersHorizontal },
            { label: 'Tipos de Atendimento', icon: SlidersHorizontal },
            { label: 'Origens', icon: SlidersHorizontal },
            { label: 'Mídias', icon: SlidersHorizontal },
            { label: 'Modelos de Interesse', icon: SlidersHorizontal },
            { label: 'Motivos Insucesso', icon: SlidersHorizontal },
            { label: 'Motivos Andamento', icon: SlidersHorizontal },
            { label: 'Empresas', icon: SlidersHorizontal },
            { label: 'Temperatura', icon: SlidersHorizontal },
            { label: 'Tipo de Ação', icon: SlidersHorizontal },
          ]} />
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition-colors hover:text-white">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-primary" />
              {empresa} <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none border-0 p-0 shadow-2xl">
              <div className="border-b border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs font-bold uppercase tracking-widest text-white">Unidade</div>
              {EMPRESAS.map((item) => (
                <DropdownMenuItem
                  key={item}
                  className="cursor-pointer rounded-none px-4 py-2.5 text-xs font-semibold uppercase"
                  onClick={() => setEmpresa(item)}
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" className="text-white/60 transition-colors hover:text-white">
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="text-white/60 transition-colors hover:text-white">
            <Settings className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white transition-colors hover:bg-primary/80">
              {userInitial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-semibold uppercase" onClick={() => logout()}>
                <LogOut className="h-3.5 w-3.5" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
