import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blobParaBase64, iniciarGravacao, LIMITE_GRAVACAO, tipoBase, type Gravacao } from "@/lib/gravador";

export type AudioGravado = { audioBase64: string; tipo: "audio/webm" | "audio/mp4" | "audio/ogg" | "audio/wav" };

type Props = {
  /** Deve lançar erro se o envio/transcrição falhar — assim a gravação é guardada para tentar de novo. */
  aoTranscrever: (audio: AudioGravado) => Promise<void>;
  ocupado: boolean;
};

const TIPOS = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"] as const;
const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function BotaoGravar({ aoTranscrever, ocupado }: Props) {
  const gravacaoRef = useRef<Gravacao | null>(null);
  const inicioRef = useRef(0);
  const [gravando, setGravando] = useState(false);
  const [nivel, setNivel] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [pendente, setPendente] = useState<Blob | null>(null);
  const [enviando, setEnviando] = useState(false);
  const terminarRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!gravando) return;
    const id = window.setInterval(() => {
      setNivel(gravacaoRef.current?.nivel() ?? 0);
      const passados = (Date.now() - inicioRef.current) / 1000;
      setSegundos(passados);
      if (passados >= LIMITE_GRAVACAO) {
        toast.info("Chegou ao limite de 3 minutos. Enviando o que você falou.");
        void terminarRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [gravando]);

  useEffect(() => () => gravacaoRef.current?.cancelar(), []);

  async function comecar() {
    try {
      gravacaoRef.current = await iniciarGravacao();
      inicioRef.current = Date.now();
      setSegundos(0);
      setPendente(null);
      setGravando(true);
    } catch {
      toast.error("Precisamos da permissão do microfone para ouvir você.");
    }
  }

  async function enviar(blob: Blob) {
    setEnviando(true);
    try {
      const base = tipoBase(blob.type);
      const tipo = (TIPOS as readonly string[]).includes(base) ? (base as AudioGravado["tipo"]) : "audio/wav";
      await aoTranscrever({ audioBase64: await blobParaBase64(blob), tipo });
      setPendente(null);
    } catch (erro) {
      setPendente(blob);
      const msg = erro instanceof Error ? erro.message : "";
      toast.error(`${/créditos|curta|entender/i.test(msg) ? msg : "Não conseguimos enviar o áudio."} Sua gravação foi guardada.`);
    } finally {
      setEnviando(false);
    }
  }

  async function terminar() {
    const gravacao = gravacaoRef.current;
    if (!gravacao) return;
    gravacaoRef.current = null;
    setGravando(false);
    const duracao = (Date.now() - inicioRef.current) / 1000;
    const blob = await gravacao.parar();
    if (duracao < 1 || blob.size < 1500) {
      toast.error("A gravação ficou muito curta. Aperte o botão e fale um pouco mais.");
      return;
    }
    await enviar(blob);
  }
  terminarRef.current = terminar;

  if (ocupado || enviando) {
    return (
      <Button size="lg" disabled className="h-16 w-full text-lg">
        <Loader2 className="mr-2 size-6 animate-spin" />
        Escutando o que você falou...
      </Button>
    );
  }

  if (pendente) {
    return (
      <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-base">Não conseguimos enviar. Sua fala está guardada, não precisa falar de novo.</p>
        <Button size="lg" className="h-16 w-full text-lg font-bold" onClick={() => void enviar(pendente)}>
          <RotateCcw className="mr-2 size-6" />
          Tentar enviar de novo
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setPendente(null)}>
          <Trash2 className="mr-2 size-4" />
          Descartar e gravar outra vez
        </Button>
      </div>
    );
  }

  const restantes = Math.max(0, LIMITE_GRAVACAO - segundos);
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
            Parar e enviar
          </>
        ) : (
          <>
            <Mic className="mr-2 size-6" />
            Apertar e falar
          </>
        )}
      </Button>
      {gravando && (
        <>
          <p className={`text-center text-lg font-bold ${restantes <= 30 ? "text-destructive" : ""}`} aria-live="polite">
            Faltam {relogio(restantes)} (máximo 3 minutos)
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-150"
              style={{ width: `${Math.max(6, nivel * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
