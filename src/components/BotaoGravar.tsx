import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blobParaBase64, iniciarGravacao, type Gravacao } from "@/lib/gravador";

type Props = {
  aoTranscrever: (base64: string) => Promise<void>;
  ocupado: boolean;
};

export function BotaoGravar({ aoTranscrever, ocupado }: Props) {
  const gravacaoRef = useRef<Gravacao | null>(null);
  const [gravando, setGravando] = useState(false);
  const [nivel, setNivel] = useState(0);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!gravando) return;
    const id = window.setInterval(() => {
      setNivel(gravacaoRef.current?.nivel() ?? 0);
      setSegundos((s) => s + 0.2);
    }, 200);
    return () => window.clearInterval(id);
  }, [gravando]);

  useEffect(() => () => gravacaoRef.current?.cancelar(), []);

  async function comecar() {
    try {
      gravacaoRef.current = await iniciarGravacao();
      setSegundos(0);
      setGravando(true);
    } catch {
      toast.error("Precisamos da permissão do microfone para ouvir você.");
    }
  }

  async function terminar() {
    const gravacao = gravacaoRef.current;
    if (!gravacao) return;
    setGravando(false);
    gravacaoRef.current = null;
    const blob = await gravacao.parar();
    if (blob.size < 6000) {
      toast.error("A gravação ficou muito curta. Aperte o botão e fale um pouco mais.");
      return;
    }
    await aoTranscrever(await blobParaBase64(blob));
  }

  if (ocupado) {
    return (
      <Button size="lg" disabled className="h-16 w-full text-lg">
        <Loader2 className="mr-2 size-6 animate-spin" />
        Escutando o que você falou...
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        variant={gravando ? "destructive" : "default"}
        className="h-16 w-full text-lg font-bold"
        onClick={() => void (gravando ? terminar() : comecar())}
      >
        {gravando ? (
          <>
            <Square className="mr-2 size-6 fill-current" />
            Parar e enviar ({Math.floor(segundos)}s)
          </>
        ) : (
          <>
            <Mic className="mr-2 size-6" />
            Apertar e falar
          </>
        )}
      </Button>
      {gravando && (
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-150"
            style={{ width: `${Math.max(6, nivel * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
