import { INSTRUCAO_MARCADORES, organizacaoParaIA } from "@/lib/privacidade";
import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { instrucoesEstrutura, juntarHtml, limparPerguntasExtras, LIMITE_TEXTO, montarSecoes, normalizarEstrutura, normalizarSecoesProjeto, SECAO_CRITERIOS } from "@/lib/edital";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

function criarModelo(apiKey: string) {
  return createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

function pegarChave() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("A inteligência artificial não está configurada.");
  return key;
}

async function exigirAprovacao(context: { supabase: SupabaseClient<Database>; userId: string }, usaIa = true) {
  const { data } = await context.supabase.rpc("is_approved", { _user_id: context.userId });
  if (!data) throw new Error("Seu cadastro ainda precisa ser aprovado.");
  if (!usaIa) return;
  const { data: uso, error } = await context.supabase.rpc("registrar_uso_ia");
  if (error) throw new Error("Não foi possível verificar seu limite de uso. Tente novamente.");
  if (uso === -1) throw new Error("Você atingiu o limite diário de uso da inteligência artificial. Tente novamente amanhã — tudo o que já foi feito está salvo.");
}

const opcoesRaciocinio = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Transcrever áudio                                                    */
/* ------------------------------------------------------------------ */

export const transcreverAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      audioBase64: z.string().min(100).max(9_000_000),
      tipo: z.enum(["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"]).default("audio/wav"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const apiKey = pegarChave();
    const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength < 1500) {
      throw new Error("A gravação ficou muito curta. Fale um pouco mais e tente de novo.");
    }

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    const extensao = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav" }[data.tipo];
    form.append("file", new Blob([bytes], { type: data.tipo }), `gravacao.${extensao}`);
    form.append("language", "pt");

    const resposta = await fetch(`${GATEWAY_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      console.error(`Transcrição falhou [${resposta.status}]: ${corpo}`);
      if (resposta.status === 402) {
        throw new Error("Os créditos de inteligência artificial acabaram.");
      }
      throw new Error("Não conseguimos entender o áudio. Tente gravar de novo.");
    }

    const json = (await resposta.json()) as { text?: string };
    return { texto: (json.text ?? "").trim() };
  });

/* ------------------------------------------------------------------ */
/* Ler um edital em PDF                                                 */
/* ------------------------------------------------------------------ */

const EditalInput = z.object({
  nomeArquivo: z.string().max(255),
  pdfBase64: z.string().min(100).max(16_500_000),
});

export const lerEdital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EditalInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const apiKey = pegarChave();
    const lovable = criarModelo(apiKey);

    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Leia este edital brasileiro e responda SOMENTE com um JSON válido, sem comentários e sem blocos de código, no formato:",
                '{"titulo":"","orgao":"","resumo":"","prazo":"AAAA-MM-DD ou vazio","valor_maximo":"","exigencias":"","secoes":[{"nome":"","conteudo":"","limite":""}],"criterios":[{"nome":"","descricao":"","pontuacao_maxima":""}],"texto_completo":""}',
                "- resumo: 2 a 3 frases em linguagem simples.",
                "- exigencias: quem pode participar e documentos exigidos, em texto corrido separado por ponto e vírgula.",
                "- secoes: TODAS as seções obrigatórias da proposta/projeto, na ordem do edital (ou do formulário/anexo), com o nome exato, o que deve conter e o limite de tamanho (caracteres, linhas, páginas) se houver; senão limite vazio. Lista vazia se o edital não definir.",
                "- criterios: TODOS os critérios de avaliação/pontuação, com nome, o que é avaliado e a pontuação máxima. Lista vazia se não houver.",
                "- texto_completo: transcrição fiel e integral do texto do edital, sem resumir (pode omitir só cabeçalhos/rodapés repetidos).",
                "Nunca invente seções, critérios ou pontuações que não estejam no documento.",
              ].join("\n"),
            },
            {
              type: "file",
              data: data.pdfBase64,
              mediaType: "application/pdf",
              filename: data.nomeArquivo,
            },
          ],
        },
      ],
    });

    const texto = await resultado.text;
    const limpo = texto.replace(/```json|```/g, "").trim();
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");

    try {
      const bruto = JSON.parse(limpo.slice(inicio, fim + 1)) as Record<string, string>;
      const estrutura = normalizarEstrutura({ secoes: (bruto as Record<string, unknown>)["secoes"], criterios: (bruto as Record<string, unknown>)["criterios"] });
      return {
        texto_completo: (bruto["texto_completo"] || "").slice(0, LIMITE_TEXTO) || null,
        criterios: estrutura as unknown as Json,
        titulo: bruto["titulo"] || data.nomeArquivo.replace(/\.pdf$/i, ""),
        orgao: bruto["orgao"] || "",
        resumo: bruto["resumo"] || "",
        prazo: /^\d{4}-\d{2}-\d{2}$/.test(bruto["prazo"] ?? "") ? bruto["prazo"]! : null,
        valor_maximo: bruto["valor_maximo"] || "",
        exigencias: bruto["exigencias"] || "",
      };
    } catch {
      throw new Error("Não conseguimos ler esse arquivo. Tente enviar outro PDF do edital.");
    }
  });

/* ------------------------------------------------------------------ */
/* Comparar edital e organização                                       */
/* ------------------------------------------------------------------ */

const AnaliseInput = z.object({
  edital: z.object({
    titulo: z.string().max(5000), orgao: z.string().max(5000).nullable(), resumo: z.string().max(5000).nullable(),
    exigencias: z.string().max(20_000).nullable(), valor_maximo: z.string().max(5000).nullable(), prazo: z.string().max(5000).nullable(),
  }),
  organizacaoId: z.string().uuid(),
  documentos: z.array(z.object({ categoria: z.string().max(5000), nome: z.string().max(5000), data_validade: z.string().max(5000).nullable() })).max(300),
});

/** Carrega a organização no servidor e devolve só os campos permitidos para a IA. */
async function organizacaoSegura(supabase: SupabaseClient<Database>, id: string) {
  const { data: org } = await supabase.from("organizacoes").select("*").eq("id", id).maybeSingle();
  if (!org) throw new Error("Não encontramos a organização.");
  return organizacaoParaIA(org);
}

export const analisarEdital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnaliseInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const organizacao = await organizacaoSegura(context.supabase, data.organizacaoId);
    const lovable = criarModelo(pegarChave());
    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      system: [
        "Você confere editais brasileiros para organizações comunitárias.",
        "Não dê parecer jurídico e não diga simplesmente se a organização pode ou não concorrer.",
        "Compare cada requisito com as informações fornecidas. Nunca presuma nem invente uma comprovação.",
        "Responda somente JSON válido, sem markdown.",
      ].join(" "),
      prompt: [
        "Gere JSON neste formato:",
        '{"resumo":"frase simples","itens":[{"requisito":"","situacao":"atendido|pendente|nao_localizado","evidencia":"","orientacao":""}]}',
        "EDITAL:", JSON.stringify(data.edital),
        "ORGANIZAÇÃO (dados pessoais aparecem só como cadastrado/não cadastrado):", JSON.stringify(organizacao),
        "DOCUMENTOS (considere vencidos os que tiverem validade anterior à data atual):", JSON.stringify(data.documentos),
        "Separe todos os requisitos de participação, documentos, regularidade, território, experiência, prazo, contrapartida e impedimentos.",
      ].join("\n"),
    });
    const texto = (await resultado.text).replace(/```json|```/g, "").trim();
    try {
      const inicio = texto.indexOf("{"); const fim = texto.lastIndexOf("}");
      return z.object({
        resumo: z.string(),
        itens: z.array(z.object({
          requisito: z.string(), situacao: z.enum(["atendido", "pendente", "nao_localizado"]),
          evidencia: z.string(), orientacao: z.string(),
        })),
      }).parse(JSON.parse(texto.slice(inicio, fim + 1)));
    } catch {
      throw new Error("Não conseguimos montar o checklist desse edital. Tente novamente.");
    }
  });

/* ------------------------------------------------------------------ */
/* Sugerir ideias compatíveis                                           */
/* ------------------------------------------------------------------ */

const IdeiasInput = z.object({
  edital: z.object({ titulo: z.string().max(5000), orgao: z.string().max(5000).nullable(), resumo: z.string().max(5000).nullable(), exigencias: z.string().max(20_000).nullable(), valor_maximo: z.string().max(5000).nullable() }),
  organizacaoId: z.string().uuid(),
  checklist: z.array(z.object({ requisito: z.string().max(5000), situacao: z.string().max(5000), evidencia: z.string().max(5000), orientacao: z.string().max(5000) })).max(150),
});

export const sugerirIdeias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdeiasInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const organizacao = await organizacaoSegura(context.supabase, data.organizacaoId);
    const lovable = criarModelo(pegarChave());
    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      system: [
        "Você ajuda organizações de pesca artesanal a imaginar projetos viáveis para editais brasileiros.",
        "Crie sugestões diferentes entre si e compatíveis com o edital e com as capacidades comprovadas da organização.",
        "Nunca invente experiência, parceria, estrutura, quantidade de pessoas, orçamento ou recurso disponível.",
        "O que depender de confirmação deve aparecer em recursos_confirmar.",
        "Responda somente JSON válido, sem markdown.",
      ].join(" "),
      prompt: [
        'Gere exatamente 3 ideias no formato: {"ideias":[{"titulo":"","objetivo":"","problema":"","publico":"","atividades":[""],"resultados":[""],"relacao_edital":"","recursos_confirmar":[""]}]}',
        `EDITAL: ${JSON.stringify(data.edital)}`,
        `ORGANIZAÇÃO: ${JSON.stringify(organizacao)}`,
        `CHECKLIST: ${JSON.stringify(data.checklist)}`,
        "Use linguagem simples, concreta e respeitosa. Não trate a sugestão como fato já decidido pela comunidade.",
      ].join("\n"),
    });
    const texto = (await resultado.text).replace(/```json|```/g, "").trim();
    try {
      const inicio = texto.indexOf("{"); const fim = texto.lastIndexOf("}");
      return z.object({ ideias: z.array(z.object({
        titulo: z.string(), objetivo: z.string(), problema: z.string(), publico: z.string(),
        atividades: z.array(z.string()), resultados: z.array(z.string()), relacao_edital: z.string(), recursos_confirmar: z.array(z.string()),
      })).length(3) }).parse(JSON.parse(texto.slice(inicio, fim + 1)));
    } catch {
      throw new Error("Não conseguimos montar as ideias agora. Tente novamente.");
    }
  });

/* ------------------------------------------------------------------ */
/* Escrever o projeto, uma parte por vez                                */
/* ------------------------------------------------------------------ */

async function carregarProjeto(supabase: SupabaseClient<Database>, projetoId: string) {
  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, titulo, edital_id, organizacao_id, analise_id, respostas, secoes")
    .eq("id", projetoId).maybeSingle();
  if (!projeto) throw new Error("Não encontramos esse projeto.");
  if (!projeto.edital_id || !projeto.organizacao_id) throw new Error("Este projeto não está ligado a um edital e organização.");
  const { data: edital } = await supabase
    .from("editais")
    .select("titulo, orgao, resumo, exigencias, valor_maximo, prazo, texto_completo, criterios")
    .eq("id", projeto.edital_id).maybeSingle();
  if (!edital) throw new Error("Não encontramos o edital deste projeto.");
  return { projeto, edital };
}

export const planejarProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projetoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context, false);
    const { projeto, edital } = await carregarProjeto(context.supabase, data.projetoId);
    if (normalizarSecoesProjeto(projeto.secoes).length > 0) return { total: normalizarSecoesProjeto(projeto.secoes).length };
    const secoes = montarSecoes(normalizarEstrutura(edital.criterios));
    const { error } = await context.supabase.from("projetos")
      .update({ secoes: secoes as unknown as Json, status: "rascunho", updated_at: new Date().toISOString() })
      .eq("id", data.projetoId);
    if (error) throw new Error("Não conseguimos preparar o projeto.");
    return { total: secoes.length };
  });

const SecaoInput = z.object({
  projetoId: z.string().uuid(),
  indice: z.number().int().min(0).max(100),
  instrucao: z.string().max(4000).optional(),
});

export const escreverSecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SecaoInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const { projeto, edital } = await carregarProjeto(context.supabase, data.projetoId);
    const secoes = normalizarSecoesProjeto(projeto.secoes);
    const secao = secoes[data.indice];
    if (!secao) throw new Error("Essa parte do projeto não existe.");

    const organizacao = await organizacaoSegura(context.supabase, projeto.organizacao_id!);
    const { data: analise } = projeto.analise_id
      ? await context.supabase.from("analises_editais").select("checklist").eq("id", projeto.analise_id).maybeSingle()
      : { data: null };

    const estrutura = normalizarEstrutura(edital.criterios);
    const respostas = Array.isArray(projeto.respostas) ? (projeto.respostas as { pergunta?: string; resposta?: string }[]) : [];
    const falas = respostas.filter((r) => r?.resposta?.trim()).map((r) => `Pergunta: ${r.pergunta}\nResposta da comunidade: ${r.resposta}`).join("\n\n");
    const outras = secoes.map((s, i) => (i !== data.indice && s.html ? `<h3>${s.nome}</h3>\n${s.html}` : "")).filter(Boolean).join("\n").slice(0, 60_000);
    const primeira = data.indice === 0 && !data.instrucao;
    const ehCriterios = secao.nome === SECAO_CRITERIOS;

    const lovable = criarModelo(pegarChave());
    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      system: [
        "Você é um redator experiente de projetos sociais e socioambientais no Brasil, especialista em editais públicos e em pesca artesanal.",
        "Escreva em português do Brasil, formal e pronto para submissão. Você escreve UMA parte do projeto por vez.",
        "Responda de forma explícita aos critérios de pontuação relacionados a esta parte.",
        "Use SOMENTE as informações cadastradas da organização, comprovadas no checklist ou contadas pela comunidade. Onde faltar dado, escreva [COMPLETAR: ...].",
        "Nunca invente nomes, CNPJ, telefones, endereços, experiências ou valores. Não repita o que outras partes já dizem.",
        INSTRUCAO_MARCADORES,
        "Responda em HTML simples usando apenas p, ul, li, ol, table, tr, th, td e strong. NÃO inclua o título da parte. Não use markdown nem ```.",
        primeira ? "Na PRIMEIRA linha escreva TITULO: <um título forte para o projeto>, depois o HTML da parte." : "",
      ].filter(Boolean).join(" "),
      prompt: [
        `EDITAL: ${edital.titulo}`,
        edital.orgao ? `ÓRGÃO: ${edital.orgao}` : "",
        edital.resumo ? `SOBRE O EDITAL: ${edital.resumo}` : "",
        edital.valor_maximo ? `VALOR: ${edital.valor_maximo}` : "",
        edital.exigencias ? `EXIGÊNCIAS: ${edital.exigencias}` : "",
        edital.texto_completo ? `TEXTO COMPLETO DO EDITAL:\n"""\n${edital.texto_completo.slice(0, LIMITE_TEXTO)}\n"""` : "",
        "", instrucoesEstrutura(estrutura), "",
        `ORGANIZAÇÃO: ${JSON.stringify(organizacao)}`,
        `CHECKLIST: ${JSON.stringify(analise?.checklist ?? [])}`,
        "", "O QUE A COMUNIDADE CONTOU:", falas || "(nada)", "",
        outras ? `PARTES JÁ ESCRITAS (para manter coerência):\n${outras}` : "",
        "",
        `ESCREVA AGORA SOMENTE A PARTE: "${secao.nome}" (parte ${data.indice + 1} de ${secoes.length}).`,
        secao.conteudo ? `Deve conter: ${secao.conteudo}` : "",
        secao.limite ? `LIMITE OBRIGATÓRIO: ${secao.limite}.` : "Escreva pelo menos dois parágrafos consistentes.",
        ehCriterios ? "Faça a tabela com uma linha para cada critério, indicando a pontuação e em qual parte do projeto ele é respondido." : "",
        data.instrucao ? `TEXTO ATUAL DESTA PARTE:\n${secao.html}\n\nPEDIDO DE MUDANÇA DA PESSOA: ${data.instrucao}\nReescreva a parte atendendo ao pedido, sem inventar dados.` : "",
      ].filter(Boolean).join("\n"),
    });

    let texto = (await resultado.text).replace(/```html|```/g, "").trim();
    let titulo = projeto.titulo;
    if (primeira) {
      const m = texto.match(/^\s*TITULO:\s*(.+)\s*\n/i);
      if (m) { titulo = m[1]!.replace(/<[^>]+>/g, "").trim().slice(0, 120); texto = texto.slice(m[0].length).trim(); }
    }
    texto = texto.replace(/^<h[23][^>]*>.*?<\/h[23]>\s*/i, "");
    if (!texto) throw new Error("Essa parte veio vazia. Tente de novo.");

    secoes[data.indice] = { ...secao, html: texto };
    const pronto = secoes.every((s) => s.html.trim());
    const { error } = await context.supabase.from("projetos").update({
      secoes: secoes as unknown as Json,
      titulo,
      conteudo: juntarHtml(titulo, secoes),
      status: pronto ? "pronto" : "rascunho",
      updated_at: new Date().toISOString(),
    }).eq("id", data.projetoId);
    if (error) throw new Error("Não conseguimos salvar essa parte.");
    return { ok: true, pronto };
  });

/* ------------------------------------------------------------------ */
/* "Só falta isso": perguntas sobre o que ainda falta                   */
/* ------------------------------------------------------------------ */

const FaltaInput = z.object({
  editalId: z.string().uuid(),
  organizacaoId: z.string().uuid(),
  respostas: z.array(z.object({ pergunta: z.string().max(500), resposta: z.string().max(20_000) })).max(20),
});

export const perguntasFaltantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FaltaInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const { data: edital } = await context.supabase.from("editais")
      .select("titulo, resumo, exigencias, valor_maximo, prazo, texto_completo, criterios")
      .eq("id", data.editalId).maybeSingle();
    if (!edital) throw new Error("Não encontramos o edital.");
    const organizacao = await organizacaoSegura(context.supabase, data.organizacaoId);
    const falas = data.respostas.filter((r) => r.resposta.trim())
      .map((r) => `Pergunta: ${r.pergunta}\nResposta: ${r.resposta}`).join("\n\n");

    const lovable = criarModelo(pegarChave());
    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      system: [
        "Você ajuda pescadores artesanais com pouca leitura a completar um projeto para edital.",
        "Compare o que a comunidade já contou com as seções e critérios de pontuação do edital e descubra o que AINDA FALTA para escrever o projeto sem lacunas: números (pessoas, famílias, quantidades), prazos e datas, valores e custos, parceiros e apoios, local.",
        "Faça no máximo 5 perguntas, as mais importantes para a pontuação. Cada pergunta: curta (até 20 palavras), uma coisa só, linguagem simples do dia a dia, sem termos técnicos, falando com 'você' ou 'vocês'.",
        "Não pergunte o que já foi respondido nem o que está nos dados da organização. Nunca peça CPF, telefone, e-mail ou endereço.",
        "Se nada importante faltar, devolva lista vazia. Responda somente JSON válido, sem markdown.",
      ].join(" "),
      prompt: [
        'Formato: {"perguntas":["..."]}',
        `EDITAL: ${edital.titulo}`,
        edital.resumo ? `SOBRE: ${edital.resumo}` : "",
        edital.valor_maximo ? `VALOR: ${edital.valor_maximo}` : "",
        edital.exigencias ? `EXIGÊNCIAS: ${edital.exigencias}` : "",
        instrucoesEstrutura(normalizarEstrutura(edital.criterios)),
        edital.texto_completo ? `TRECHO DO EDITAL:\n"""\n${edital.texto_completo.slice(0, 60_000)}\n"""` : "",
        `ORGANIZAÇÃO: ${JSON.stringify(organizacao)}`,
        "O QUE A COMUNIDADE JÁ CONTOU:", falas || "(nada)",
      ].filter(Boolean).join("\n"),
    });
    const texto = (await resultado.text).replace(/```json|```/g, "").trim();
    try {
      const inicio = texto.indexOf("{"); const fim = texto.lastIndexOf("}");
      const json = JSON.parse(texto.slice(inicio, fim + 1)) as { perguntas?: unknown };
      return { perguntas: limparPerguntasExtras(json.perguntas) };
    } catch {
      throw new Error("Não conseguimos preparar as últimas perguntas. Você pode pular esta etapa.");
    }
  });
