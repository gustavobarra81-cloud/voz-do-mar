import { describe, expect, it } from "vitest";
import { escolherTipo, LIMITE_GRAVACAO, tipoBase } from "./gravador";

describe("gravador", () => {
  it("limita cada gravação a 3 minutos", () => expect(LIMITE_GRAVACAO).toBe(180));
  it("prefere webm com opus", () => expect(escolherTipo(() => true)).toBe("audio/webm;codecs=opus"));
  it("usa mp4 quando só ele existe (Safari)", () => expect(escolherTipo((t) => t === "audio/mp4")).toBe("audio/mp4"));
  it("cai para WAV quando nada comprimido existe", () => expect(escolherTipo(() => false)).toBeNull());
  it("remove o codec do tipo", () => expect(tipoBase("audio/webm;codecs=opus")).toBe("audio/webm"));
});
