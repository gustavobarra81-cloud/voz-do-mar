import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizacoes } from "@/lib/useOrganizacoes";

type Props = { onChange?: (id: string) => void; mostrarNova?: boolean };

export function SeletorOrganizacao({ onChange, mostrarNova = true }: Props) {
  const { organizacoes, organizacao, escolher } = useOrganizacoes();
  return <div className="space-y-2">
    <Label htmlFor="organizacao-ativa">Organização</Label>
    <div className="flex flex-wrap gap-2">
      <Select value={organizacao?.id ?? ""} onValueChange={(id) => { escolher(id); onChange?.(id); }}>
        <SelectTrigger id="organizacao-ativa" className="min-h-12 min-w-0 flex-1 text-base"><SelectValue placeholder="Escolha a organização" /></SelectTrigger>
        <SelectContent>{organizacoes.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome_fantasia || item.razao_social || "Organização sem nome"}</SelectItem>)}</SelectContent>
      </Select>
      {mostrarNova && <Button asChild variant="outline" className="h-12"><Link to="/organizacao" search={{ nova: true }}>Nova organização</Link></Button>}
    </div>
  </div>;
}