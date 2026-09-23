import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .handler(async ({ data }) => {
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
  .handler(async ({ data }) => {
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
                '{"titulo":"","orgao":"","resumo":"","prazo":"AAAA-MM-DD ou vazio","valor_maximo":"","exigencias":""}',
                "- resumo: 2 a 3 frases em linguagem simples.",
                "- exigencias: liste as seções obrigatórias do projeto, critérios de avaliação e quem pode participar, em texto corrido separado por ponto e vírgula.",
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
      return {
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
  .handler(async ({ data }) => {
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
/* Escrever o projeto                                                   */
/* ------------------------------------------------------------------ */

const ProjetoInput = z.object({
  editalTitulo: z.string(),
  editalOrgao: z.string().nullable(),
  editalResumo: z.string().nullable(),
  editalExigencias: z.string().nullable(),
  editalValor: z.string().nullable(),
  organizacao: z.record(z.string(), z.unknown()),
  checklist: z.array(z.object({ requisito: z.string(), situacao: z.string(), evidencia: z.string(), orientacao: z.string() })),
  respostas: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).min(1),
});

export const escreverProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProjetoInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = pegarChave();
    const lovable = criarModelo(apiKey);

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
        "Use SOMENTE as informações cadastradas da organização, comprovadas no checklist ou contadas pela comunidade. Onde faltar dado (valores, datas, número de pessoas), escreva um marcador entre colchetes, por exemplo [COMPLETAR: número de famílias].",
        "Nunca invente nomes, CNPJ, telefones, endereços ou valores.",
        "Responda em HTML simples usando apenas as tags h2, h3, p, ul, li, ol, table, tr, th, td e strong. Não use markdown nem ```.",
      ].join(" "),
      prompt: [
        `EDITAL: ${data.editalTitulo}`,
        data.editalOrgao ? `ÓRGÃO: ${data.editalOrgao}` : "",
        data.editalResumo ? `SOBRE O EDITAL: ${data.editalResumo}` : "",
        data.editalValor ? `VALOR: ${data.editalValor}` : "",
        data.editalExigencias ? `EXIGÊNCIAS DO EDITAL: ${data.editalExigencias}` : "",
        `DADOS CADASTRADOS DA ORGANIZAÇÃO: ${JSON.stringify(data.organizacao)}`,
        `CHECKLIST DA ANÁLISE: ${JSON.stringify(data.checklist)}`,
        "",
        "O QUE A COMUNIDADE CONTOU (transcrição da fala):",
        falas,
        "",
        "Escreva o projeto completo seguindo exatamente as seções exigidas pelo edital. Se o edital não listar seções, use: Identificação do proponente; Justificativa; Objetivo geral; Objetivos específicos; Público beneficiado; Metodologia; Metas e cronograma; Orçamento estimado (em tabela); Resultados esperados; Sustentabilidade após o projeto.",
        "Comece com um <h2> com um título forte para o projeto. Cada seção deve ter pelo menos dois parágrafos consistentes.",
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
