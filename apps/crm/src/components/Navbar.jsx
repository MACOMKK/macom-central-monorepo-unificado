import { Link, useLocation, useNavigate } from 'react-router-dom';
import { localCrmDb } from '@/api/localCrmDb';
import { ChevronDown, Bell, Settings, Tag, DollarSign, Columns3, Headphones, Calendar, CalendarDays, PieChart, LayoutDashboard, BarChart3, GraduationCap, Lock, LogOut, MapPin, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEmpresa } from '@/context/EmpresaContext';
import { cn } from '@/lib/utils';

const EMPRESAS = ['Todas', 'Macom Ananindeua', 'Macom Belém', 'Macom Paragominas'];

function NavMenu({ label, items }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-bold text-white/80 hover:text-white px-3 py-2 uppercase tracking-widest transition-colors border-b-2 border-transparent hover:border-primary data-[state=open]:border-primary data-[state=open]:text-white">
        {label} <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0 rounded-none border-0 shadow-2xl">
        <div className="px-4 py-3 bg-[#1a1a1a] text-white text-sm font-bold uppercase tracking-widest border-b border-white/10">{label}</div>
        {items ? items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className="px-4 py-3 gap-3 cursor-pointer text-xs font-semibold uppercase tracking-wider rounded-none hover:bg-red-50 hover:text-primary focus:bg-red-50 focus:text-primary"
            onClick={() => item.path && navigate(item.path)}
          >
            <span className="w-6 h-6 rounded-sm bg-primary text-white flex items-center justify-center shrink-0">
              <item.icon className="w-3.5 h-3.5" />
            </span>
            {item.label}
          </DropdownMenuItem>
        )) : (
          <div className="py-8 flex flex-col items-center text-center px-4 bg-white">
            <Lock className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground font-semibold uppercase">Sem acesso aos módulos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Contate um administrador</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { empresa, setEmpresa } = useEmpresa();

  return (
    <header>
      {/* Top bar */}
      <div className="bg-[#111111] text-white/60 text-[11px] px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> (91) 3075-9000</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Macom Mitsubishi — Ananindeua, Belém, Paragominas</span>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-white/60 hover:text-white text-[11px] font-semibold uppercase tracking-wider transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
              {empresa} <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none shadow-2xl border-0 p-0">
              <div className="px-3 py-2 bg-[#1a1a1a] text-white text-xs font-bold uppercase tracking-widest border-b border-white/10">Unidade</div>
              {EMPRESAS.map((e) => (
                <DropdownMenuItem key={e} className="py-2.5 px-4 text-xs font-semibold uppercase cursor-pointer rounded-none" onClick={() => setEmpresa(e)}>
                  {e}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="hover:text-white transition-colors"><Bell className="w-3.5 h-3.5" /></button>
          <button className="hover:text-white transition-colors"><Settings className="w-3.5 h-3.5" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold hover:bg-primary/80 transition-colors">K</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-semibold uppercase" onClick={() => localCrmDb.auth.logout()}>
                <LogOut className="w-3.5 h-3.5" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-[#1a1a1a] px-6 flex items-center h-12">
        <Link to="/" className="flex items-center gap-2.5 mr-6 shrink-0">
          <div className="w-7 h-7 bg-primary flex items-center justify-center rounded-sm">
            <span className="text-white font-black text-sm">M</span>
          </div>
          <span className="text-white font-black text-sm tracking-widest uppercase">Macom</span>
          <span className="text-white/30 mx-1">|</span>
          <span className="text-white/60 font-semibold text-xs tracking-widest uppercase">CRM</span>
        </Link>

        <nav className="hidden md:flex items-center h-full">
          <NavMenu label="Vendas" items={[
            { label: 'Eventos', icon: Tag, path: '/' },
            { label: 'Central de Leads', icon: DollarSign, path: '/leads' },
            { label: 'Estoque', icon: Columns3 },
            { label: 'Recepção', icon: Headphones },
          ]} />
          <NavMenu label="Pós-Vendas" items={[
            { label: 'Eventos', icon: Tag, path: '/' },
            { label: 'Central de Leads', icon: DollarSign, path: '/leads' },
            { label: 'Agenda Online', icon: Calendar },
            { label: 'Agenda V2', icon: CalendarDays },
            { label: 'Painel de Retenção', icon: PieChart },
          ]} />
          <NavMenu label="Marketing" items={null} />
          <NavMenu label="Gestão" items={[
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
            { label: "KPI's", icon: BarChart3 },
            { label: 'Treinamentos', icon: GraduationCap },
          ]} />
        </nav>
      </div>
    </header>
  );
}