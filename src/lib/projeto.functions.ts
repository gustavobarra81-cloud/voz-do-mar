import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { instrucoesEstrutura, LIMITE_TEXTO, normalizarEstrutura } from "@/lib/edital";

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

async function exigirAprovacao(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("is_approved", { _user_id: context.userId });
  if (!data) throw new Error("Seu cadastro ainda precisa ser aprovado.");
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
    z.object({ audioBase64: z.string().min(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const apiKey = pegarChave();
    const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength < 4000) {
      throw new Error("A gravação ficou muito curta. Fale um pouco mais e tente de novo.");
    }

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("file", new Blob([bytes], { type: "audio/wav" }), "gravacao.wav");
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
  nomeArquivo: z.string(),
  pdfBase64: z.string().min(100),
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
    titulo: z.string(), orgao: z.string().nullable(), resumo: z.string().nullable(),
    exigencias: z.string().nullable(), valor_maximo: z.string().nullable(), prazo: z.string().nullable(),
  }),
  organizacao: z.record(z.string(), z.unknown()),
  documentos: z.array(z.object({ categoria: z.string(), nome: z.string(), data_validade: z.string().nullable() })),
});

export const analisarEdital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnaliseInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
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
        "ORGANIZAÇÃO:", JSON.stringify(data.organizacao),
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
  edital: z.object({ titulo: z.string(), orgao: z.string().nullable(), resumo: z.string().nullable(), exigencias: z.string().nullable(), valor_maximo: z.string().nullable() }),
  organizacao: z.record(z.string(), z.unknown()),
  checklist: z.array(z.object({ requisito: z.string(), situacao: z.string(), evidencia: z.string(), orientacao: z.string() })),
});

export const sugerirIdeias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdeiasInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
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
        `ORGANIZAÇÃO: ${JSON.stringify(data.organizacao)}`,
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
/* Escrever o projeto                                                   */
/* ------------------------------------------------------------------ */

const ProjetoInput = z.object({
  editalId: z.string().uuid(),
  organizacaoId: z.string().uuid(),
  checklist: z.array(z.object({ requisito: z.string(), situacao: z.string(), evidencia: z.string(), orientacao: z.string() })),
  respostas: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).min(1),
});

export const escreverProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProjetoInput.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAprovacao(context);
    const { data: edital } = await context.supabase
      .from("editais")
      .select("titulo, orgao, resumo, exigencias, valor_maximo, prazo, texto_completo, criterios")
      .eq("id", data.editalId)
      .maybeSingle();
    if (!edital) throw new Error("Não encontramos esse edital. Escolha o edital de novo.");
    const { data: org } = await context.supabase
      .from("organizacoes")
      .select("*")
      .eq("id", data.organizacaoId)
      .maybeSingle();
    if (!org) throw new Error("Não encontramos a organização selecionada.");
    const { id: _id, owner_id: _o, created_at: _c, updated_at: _u, ...organizacao } = org;

    const estrutura = normalizarEstrutura(edital.criterios);
    const lovable = criarModelo(pegarChave());

    const falas = data.respostas
      .filter((r) => r.resposta.trim().length > 0)
      .map((r) => `Pergunta: ${r.pergunta}\nResposta da comunidade: ${r.resposta}`)
      .join("\n\n");

    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: opcoesRaciocinio,
      system: [
        "Você é um redator experiente de projetos sociais e socioambientais no Brasil, especialista em editais públicos e em pesca artesanal.",
        "Escreva projetos completos, formais e prontos para submissão, sempre em português do Brasil.",
        "Siga exatamente a estrutura de seções exigida pelo edital e responda de forma explícita a cada critério de pontuação, para maximizar a nota.",
        "Use SOMENTE as informações cadastradas da organização, comprovadas no checklist ou contadas pela comunidade. Onde faltar dado (valores, datas, número de pessoas), escreva um marcador entre colchetes, por exemplo [COMPLETAR: número de famílias].",
        "Nunca invente nomes, CNPJ, telefones, endereços, experiências ou valores.",
        "Responda em HTML simples usando apenas as tags h2, h3, p, ul, li, ol, table, tr, th, td e strong. Não use markdown nem ```.",
      ].join(" "),
      prompt: [
        `EDITAL: ${edital.titulo}`,
        edital.orgao ? `ÓRGÃO: ${edital.orgao}` : "",
        edital.resumo ? `SOBRE O EDITAL: ${edital.resumo}` : "",
        edital.valor_maximo ? `VALOR: ${edital.valor_maximo}` : "",
        edital.exigencias ? `EXIGÊNCIAS DO EDITAL: ${edital.exigencias}` : "",
        edital.texto_completo ? `TEXTO COMPLETO DO EDITAL:\n"""\n${edital.texto_completo.slice(0, LIMITE_TEXTO)}\n"""` : "",
        "",
        instrucoesEstrutura(estrutura),
        "",
        `DADOS CADASTRADOS DA ORGANIZAÇÃO: ${JSON.stringify(organizacao)}`,
        `CHECKLIST DA ANÁLISE: ${JSON.stringify(data.checklist)}`,
        "",
        "O QUE A COMUNIDADE CONTOU (transcrição da fala):",
        falas,
        "",
        "Comece com um <h2> com um título forte para o projeto. Cada seção deve ter conteúdo consistente, dentro do limite indicado.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const html = (await resultado.text).replace(/```html|```/g, "").trim();
    if (!html) throw new Error("A escrita do projeto não retornou conteúdo. Tente de novo.");

    const tituloMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const titulo = (tituloMatch?.[1] ?? "Projeto").replace(/<[^>]+>/g, "").trim();

    return { html, titulo: titulo.slice(0, 120) };
  });
