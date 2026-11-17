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

import { juntarHtml, montarSecoes, proximaSecaoVazia, SECAO_CRITERIOS } from "./edital";
describe("partes do projeto", () => {
  it("segue a ordem do edital e acrescenta a parte de critérios", () => {
    const s = montarSecoes({ secoes: [{ nome: "A", conteudo: "", limite: "" }, { nome: "B", conteudo: "", limite: "" }], criterios: [{ nome: "X", descricao: "", pontuacao_maxima: "10" }] });
    expect(s.map((x) => x.nome)).toEqual(["A", "B", SECAO_CRITERIOS]);
  });
  it("sem seções usa as 10 padrão", () => {
    expect(montarSecoes({ secoes: [], criterios: [] })).toHaveLength(10);
  });
  it("retoma na primeira parte vazia e junta só as prontas", () => {
    const s = [{ nome: "A", conteudo: "", limite: "", html: "<p>a</p>" }, { nome: "B", conteudo: "", limite: "", html: "" }];
    expect(proximaSecaoVazia(s)).toBe(1);
    expect(juntarHtml("T", s)).toBe("<h2>T</h2>\n<h3>A</h3>\n<p>a</p>");
  });
});
