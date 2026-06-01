import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";
import { TAG_DEFS } from "@/lib/tags";

type Props = {
  value: string;
  onChange: (next: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
};

export function TagPicker({ value, onChange, textareaRef }: Props) {
  const fallbackRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const ref = textareaRef ?? fallbackRef;

  const insert = (token: string) => {
    const el = ref.current;
    if (!el) { onChange(value + token); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Tag className="h-3 w-3" /> Insert tag
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {TAG_DEFS.map((t) => (
          <DropdownMenuItem key={t.key} onClick={() => insert(t.label)} className="flex flex-col items-start gap-0.5">
            <span className="font-mono text-xs">{t.label}</span>
            <span className="text-[10px] text-muted-foreground">{t.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}