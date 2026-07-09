import { SmilePlus } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@macom/ui';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ReactionPicker({ onSelect }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Reagir com emoji">
          <SmilePlus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex w-auto gap-1 p-1">
        {EMOJIS.map((emoji) => (
          <DropdownMenuItem
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="cursor-pointer justify-center px-2 text-lg"
          >
            {emoji}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
