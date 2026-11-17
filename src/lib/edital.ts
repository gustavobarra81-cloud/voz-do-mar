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

export type SecaoProjeto = { nome: string; conteudo: string; limite: string; html: string };
export const SECAO_CRITERIOS = "Como o projeto atende aos critérios de avaliação";

export function montarSecoes(e: EstruturaEdital): SecaoProjeto[] {
  const base = e.secoes.length > 0
    ? e.secoes.map((s) => ({ nome: s.nome, conteudo: s.conteudo, limite: s.limite, html: "" }))
    : SECOES_PADRAO.split("; ").map((nome) => ({ nome, conteudo: "", limite: "", html: "" }));
  if (e.criterios.length > 0) base.push({ nome: SECAO_CRITERIOS, conteudo: "Tabela: Critério | Pontuação | Onde é respondido no projeto, uma linha por critério.", limite: "", html: "" });
  return base;
}

export function normalizarSecoesProjeto(valor: unknown): SecaoProjeto[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((s) => s && typeof s === "object").map((s) => {
    const v = s as Record<string, unknown>;
    return { nome: txt(v["nome"]), conteudo: txt(v["conteudo"]), limite: txt(v["limite"]), html: typeof v["html"] === "string" ? v["html"] : "" };
  }).filter((s) => s.nome);
}

export function juntarHtml(titulo: string, secoes: SecaoProjeto[]): string {
  return [`<h2>${titulo}</h2>`, ...secoes.filter((s) => s.html).map((s) => `<h3>${s.nome}</h3>\n${s.html}`)].join("\n");
}

export function proximaSecaoVazia(secoes: SecaoProjeto[]): number {
  return secoes.findIndex((s) => !s.html.trim());
}

/** Aplica uma edição manual do texto completo de volta às partes (pelos títulos <h3>). */
export function dividirHtml(html: string, secoes: SecaoProjeto[]): SecaoProjeto[] {
  const blocos = html.split(/<h3[^>]*>/i).slice(1).map((b) => {
    const fim = b.search(/<\/h3>/i);
    return { nome: b.slice(0, fim).replace(/<[^>]+>/g, "").trim(), html: b.slice(fim + 5).trim() };
  });
  const usados = new Set<number>();
  const resultado = secoes.map((s) => {
    const i = blocos.findIndex((b, k) => !usados.has(k) && b.nome === s.nome);
    if (i < 0) return s;
    usados.add(i);
    return { ...s, html: blocos[i]!.html };
  });
  blocos.forEach((b, k) => { if (!usados.has(k) && b.nome) resultado.push({ nome: b.nome, conteudo: "", limite: "", html: b.html }); });
  return resultado;
}

/** Limpa as perguntas extras vindas da IA: sem vazias, sem repetidas, curtas, no máximo 5. */
export function limparPerguntasExtras(perguntas: unknown): string[] {
  if (!Array.isArray(perguntas)) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const p of perguntas) {
    if (typeof p !== "string") continue;
    const texto = p.trim().replace(/\s+/g, " ").slice(0, 200);
    const chave = texto.toLowerCase();
    if (!texto || vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(texto);
    if (saida.length === 5) break;
  }
  return saida;
}
