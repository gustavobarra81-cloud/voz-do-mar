import { describe, expect, it } from "vitest";
import { filtrarRadar, linkWhatsApp, urgente, type RadarEdital } from "./radar";

const hoje = new Date(2026, 9, 21);
const base: RadarEdital = { id: "1", titulo: "A", orgao: null, prazo: "2026-11-30", link: "https://x.org/a", abrangencia: "nacional", temas: ["pesca"], resumo: null, publico_elegivel: null, valor: null, fonte: null };
const lista: RadarEdital[] = [
  base,
  { ...base, id: "2", titulo: "B", prazo: "2026-10-25", abrangencia: "bacia_campos", temas: ["cultura", "patrimonio"] },
  { ...base, id: "3", titulo: "C", prazo: "2026-10-01", abrangencia: "bacia_campos", temas: ["cultura"] },
];

describe("radar", () => {
  it("combina filtros de território e tema ao mesmo tempo", () => {
    expect(filtrarRadar(lista, { abrangencias: ["bacia_campos"], temas: ["cultura"], busca: "" }, hoje).map((e) => e.id)).toEqual(["2"]);
  });
  it("sem filtros mostra abertos ordenados por prazo e esconde vencidos", () => {
    expect(filtrarRadar(lista, { abrangencias: [], temas: [], busca: "" }, hoje).map((e) => e.id)).toEqual(["2", "1"]);
  });
  it("urgente quando vence em até 10 dias", () => {
    expect(urgente("2026-10-31", hoje)).toBe(true);
    expect(urgente("2026-11-01", hoje)).toBe(false);
  });
  it("compartilha pelo WhatsApp com o link do edital", () => {
    expect(decodeURIComponent(linkWhatsApp(base, hoje))).toContain("https://x.org/a");
    expect(linkWhatsApp(base, hoje).startsWith("https://wa.me/?text=")).toBe(true);
  });
});
