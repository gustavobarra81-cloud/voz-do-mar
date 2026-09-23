import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CampoDataProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function CampoData({ value, onChange, placeholder = "Escolher data" }: CampoDataProps) {
  const selecionada = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-12 w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selecionada ? format(selecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selecionada}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}