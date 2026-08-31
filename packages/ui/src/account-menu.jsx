'use client';

import { LogOut } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from './lib/utils';

function getInitials(name) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

// Visual fixo (card escuro + vermelho da marca), copiado do menu de conta original da intranet
// -- padrao unico pra todos os apps, nao segue os tokens de tema claro/escuro de cada um.
export function AccountMenu({ name, subtitle, photoUrl, onLogout, logoutLabel = 'Sair', className, children }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border border-[#E30613] bg-[#E30613] text-white outline-none transition-colors hover:bg-[#c80510] data-[state=open]:ring-2 data-[state=open]:ring-[#E30613]/25',
          className,
        )}
        aria-label="Abrir menu da conta"
      >
        <Avatar className="h-full w-full">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback className="bg-transparent text-xs font-bold uppercase text-white">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(360px,calc(100vw-2rem))] rounded-md border-[#3a3a3d] bg-[#242529] p-0 text-[#d7d7db] shadow-2xl"
      >
        <div className="px-6 py-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8f9198]">Conta</p>

          <div className="mt-6 flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0 bg-[#E30613] text-sm font-bold text-white">
              {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
              <AvatarFallback className="bg-[#E30613] text-sm font-bold text-white">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              {subtitle ? <p className="truncate text-sm text-[#a7a8ad]">{subtitle}</p> : null}
            </div>
          </div>

          {children ? <div className="mt-7 space-y-4">{children}</div> : null}

          <div className="my-6 h-px bg-[#3a3a3d]" />

          <DropdownMenuItem
            onSelect={() => onLogout?.()}
            className="gap-3 rounded-none p-0 text-sm font-bold uppercase tracking-[0.18em] text-[#d7d7db] outline-none focus:bg-transparent focus:text-[#E30613]"
          >
            <LogOut className="h-5 w-5" />
            {logoutLabel}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Item de menu no mesmo estilo dos links da intranet (ex.: "Perfil", "Configuracoes") -- pra apps
// que precisem de itens extras dentro do slot `children` do AccountMenu.
export function AccountMenuItem({ icon: Icon, children, onSelect }) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="flex items-center justify-between rounded-none p-0 text-sm font-medium text-[#d7d7db] outline-none focus:bg-transparent focus:text-white"
    >
      {children}
      {Icon ? <Icon className="h-4 w-4" /> : null}
    </DropdownMenuItem>
  );
}
