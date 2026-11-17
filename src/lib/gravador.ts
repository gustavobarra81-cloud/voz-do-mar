// Gravação de áudio: comprimido via MediaRecorder (webm/opus, mp4 no Safari); WAV 16 kHz só como último recurso.

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const value = merged[Math.floor(i * ratio)] ?? 0;
    const clamped = Math.max(-1, Math.min(1, value));
    samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(pos + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: "audio/wav" });
}

export type Gravacao = {
  parar: () => Promise<Blob>;
  cancelar: () => void;
  nivel: () => number;
};

/** Tempo máximo de cada gravação, em segundos. */
export const LIMITE_GRAVACAO = 180;

const TIPOS_COMPRIMIDOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/** Primeiro formato comprimido que o navegador grava, ou null (usa WAV). */
export function escolherTipo(suporta: (t: string) => boolean): string | null {
  return TIPOS_COMPRIMIDOS.find((t) => suporta(t)) ?? null;
}

/** Tipo sem parâmetros de codec, como o servidor espera. */
export function tipoBase(tipo: string) {
  return (tipo.split(";")[0] ?? "").trim().toLowerCase();
}

function medidor(stream: MediaStream) {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const dados = new Uint8Array(analyser.frequencyBinCount);
  return {
    ctx, source, analyser,
    nivel: () => {
      analyser.getByteFrequencyData(dados);
      let soma = 0;
      for (const v of dados) soma += v;
      return Math.min(1, soma / dados.length / 90);
    },
  };
}

export async function iniciarGravacao(): Promise<Gravacao> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = typeof MediaRecorder !== "undefined" ? escolherTipo((t) => MediaRecorder.isTypeSupported(t)) : null;
  return tipo ? gravarComprimido(stream, tipo) : gravarWav(stream);
}

function gravarComprimido(stream: MediaStream, tipo: string): Gravacao {
  const m = medidor(stream);
  const recorder = new MediaRecorder(stream, { mimeType: tipo, audioBitsPerSecond: 32000 });
  const partes: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) partes.push(e.data); };
  recorder.start(1000);
  const encerrar = () => {
    stream.getTracks().forEach((t) => t.stop());
    m.source.disconnect();
    void m.ctx.close();
  };
  return {
    nivel: m.nivel,
    cancelar: () => { if (recorder.state !== "inactive") recorder.stop(); encerrar(); },
    parar: () => new Promise<Blob>((resolve) => {
      recorder.onstop = () => { encerrar(); resolve(new Blob(partes, { type: tipoBase(recorder.mimeType || tipo) })); };
      recorder.stop();
    }),
  };
}

function gravarWav(stream: MediaStream): Gravacao {
  const m = medidor(stream);
  const processor = m.ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  m.source.connect(processor);
  processor.connect(m.ctx.destination);
  const encerrar = () => {
    stream.getTracks().forEach((t) => t.stop());
    processor.disconnect();
    m.analyser.disconnect();
    m.source.disconnect();
  };
  return {
    nivel: m.nivel,
    cancelar: () => { encerrar(); void m.ctx.close(); },
    parar: async () => {
      const taxa = m.ctx.sampleRate;
      encerrar();
      await m.ctx.close();
      return encodeWav(chunks, taxa);
    },
  };
}

export function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o áudio"));
    reader.readAsDataURL(blob);
  });
}
