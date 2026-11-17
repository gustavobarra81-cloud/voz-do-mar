import { describe, expect, it } from "vitest";
import { instrucoesEstrutura, normalizarEstrutura, SECOES_PADRAO } from "./edital";

describe("estrutura do edital", () => {
  it("formato legado [] vira estrutura vazia", () => {
    expect(normalizarEstrutura([])).toEqual({ secoes: [], criterios: [] });
  });
  it("seções aparecem na ordem do edital com limite", () => {
    const t = instrucoesEstrutura(normalizarEstrutura({ secoes: [{ nome: "Justificativa", limite: "2 páginas" }, { nome: "Orçamento" }], criterios: [] }));
    expect(t.indexOf("1. Justificativa")).toBeLessThan(t.indexOf("2. Orçamento"));
    expect(t).toContain("LIMITE: 2 páginas");
    expect(t).not.toContain(SECOES_PADRAO);
  });
  it("cada critério com pontuação é exigido", () => {
    const t = instrucoesEstrutura(normalizarEstrutura({ secoes: [], criterios: [{ nome: "Impacto", pontuacao_maxima: 30 }, { nome: "Viabilidade", pontuacao_maxima: "20" }] }));
    expect(t).toContain("Impacto (até 30 pontos)");
    expect(t).toContain("Viabilidade (até 20 pontos)");
  });
  it("sem seções usa a lista padrão", () => {
    expect(instrucoesEstrutura({ secoes: [], criterios: [] })).toContain(SECOES_PADRAO);
  });
});
