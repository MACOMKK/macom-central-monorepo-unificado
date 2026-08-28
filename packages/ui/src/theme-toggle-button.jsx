import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from './button';

export function ThemeToggleButton({ theme, onToggle, collapsed = false }) {
  const label = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';

  return (
    <Button
      variant="outline"
      onClick={onToggle}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`w-full gap-2 ${collapsed ? 'justify-center px-0' : ''}`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!collapsed ? <span>{label}</span> : null}
    </Button>
  );
}
