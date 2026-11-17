export type SecaoEdital = { nome: string; conteudo: string; limite: string };
export type CriterioEdital = { nome: string; descricao: string; pontuacao_maxima: string };
export type EstruturaEdital = { secoes: SecaoEdital[]; criterios: CriterioEdital[] };

export const SECOES_PADRAO = "Identificação do proponente; Justificativa; Objetivo geral; Objetivos específicos; Público beneficiado; Metodologia; Metas e cronograma; Orçamento estimado (em tabela); Resultados esperados; Sustentabilidade após o projeto";
export const LIMITE_TEXTO = 200_000;

const txt = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Aceita o formato novo {secoes, criterios} e o legado [] (ou qualquer valor inválido). */
export function normalizarEstrutura(valor: unknown): EstruturaEdital {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return { secoes: [], criterios: [] };
  const v = valor as Record<string, unknown>;
  const lista = (x: unknown) => (Array.isArray(x) ? x.filter((i) => i && typeof i === "object") as Record<string, unknown>[] : []);
  return {
    secoes: lista(v["secoes"]).map((s) => ({ nome: txt(s["nome"]), conteudo: txt(s["conteudo"]), limite: txt(s["limite"]) })).filter((s) => s.nome),
    criterios: lista(v["criterios"]).map((c) => ({ nome: txt(c["nome"]), descricao: txt(c["descricao"]), pontuacao_maxima: txt(c["pontuacao_maxima"]) })).filter((c) => c.nome),
  };
}

export function instrucoesEstrutura(e: EstruturaEdital): string {
  const partes: string[] = [];
  if (e.secoes.length > 0) {
    partes.push(
      "SEÇÕES OBRIGATÓRIAS (use exatamente estes nomes, nesta ordem, cada uma como <h3>; não acrescente nem omita seções):",
      ...e.secoes.map((s, i) => `${i + 1}. ${s.nome}${s.conteudo ? ` — deve conter: ${s.conteudo}` : ""}${s.limite ? ` — LIMITE: ${s.limite} (respeite)` : ""}`),
    );
  } else {
    partes.push(`O edital não lista seções. Use, como <h3>: ${SECOES_PADRAO}.`);
  }
  if (e.criterios.length > 0) {
    partes.push(
      "",
      "CRITÉRIOS DE AVALIAÇÃO (o texto deve responder explicitamente a cada um):",
      ...e.criterios.map((c, i) => `${i + 1}. ${c.nome}${c.pontuacao_maxima ? ` (até ${c.pontuacao_maxima} pontos)` : ""}${c.descricao ? ` — ${c.descricao}` : ""}`),
      "Ao final, inclua <h3>Como o projeto atende aos critérios de avaliação</h3> com uma tabela (Critério | Pontuação | Onde é respondido no projeto) com uma linha por critério.",
    );
  }
  return partes.join("\n");
}
