// Gravação de áudio em WAV (16 kHz mono) — formato aceito em qualquer navegador.

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

export async function iniciarGravacao(): Promise<Gravacao> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };

  source.connect(analyser);
  source.connect(processor);
  processor.connect(ctx.destination);

  const dados = new Uint8Array(analyser.frequencyBinCount);

  const encerrar = () => {
    stream.getTracks().forEach((t) => t.stop());
    processor.disconnect();
    analyser.disconnect();
    source.disconnect();
  };

  return {
    nivel: () => {
      analyser.getByteFrequencyData(dados);
      let soma = 0;
      for (const v of dados) soma += v;
      return Math.min(1, soma / dados.length / 90);
    },
    cancelar: () => {
      encerrar();
      void ctx.close();
    },
    parar: async () => {
      const taxa = ctx.sampleRate;
      encerrar();
      await ctx.close();
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
