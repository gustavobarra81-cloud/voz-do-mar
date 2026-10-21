import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FONTES = [
  { nome: "Capta", url: "https://capta.org.br/fontes-de-financiamento/oportunidades/" },
  { nome: "Prosas", url: "https://produtos.prosas.com.br/editais" },
  { nome: "ABCR Captadores", url: "https://captadores.org.br/category/editais/" },
  { nome: "FNMA/MMA", url: "https://www.gov.br/mma/pt-br/composicao/secex/dfre/fundo-nacional-do-meio-ambiente/editais-e-termos-de-referencia-1" },
];

function htmlParaTexto(html: string, base: string) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, txt: string) => {
      try { return ` ${txt} [${new URL(href, base).href}] `; } catch { return ` ${txt} `; }
    })
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .slice(0, 30000);
}

async function baixar(fonte: (typeof FONTES)[number]) {
  try {
    const r = await fetch(fonte.url, { headers: { "User-Agent": "Mozilla/5.0 VozDoMar" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return { ...fonte, texto: htmlParaTexto(await r.text(), fonte.url) };
  } catch { return null; }
}

const Item = z.object({
  titulo: z.string().min(3), orgao: z.string().nullable(), prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  link: z.string().url(), abrangencia: z.enum(["bacia_campos", "rj", "nacional"]),
  temas: z.array(z.string()), resumo: z.string().nullable(), publico_elegivel: z.string().nullable(), valor: z.string().nullable(),
});

export const atualizarRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Somente administradores podem atualizar o radar.");
    return executarVarreduraRadar(context.supabase);
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executarVarreduraRadar(supabase: any) {
    const context = { supabase };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A inteligência artificial não está configurada.");


    const paginas = (await Promise.all(FONTES.map(baixar))).filter((p) => p !== null);
    if (paginas.length === 0) throw new Error("Não conseguimos acessar os sites de editais agora. Tente mais tarde.");
    const hoje = new Date().toISOString().slice(0, 10);

    const lovable = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    const resultado = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
      system: [
        "Você monitora editais para o PEA Pescarte (UENF), que atua com pesca artesanal nos municípios de Arraial do Cabo, Búzios, Cabo Frio, Campos dos Goytacazes, Carapebus, Macaé, Rio das Ostras, Quissamã, São Francisco de Itabapoana e São João da Barra (RJ).",
        "Temas de interesse: pesca artesanal, meio ambiente costeiro/marinho, educação ambiental, economia solidária, cooperativismo, economia circular, arte, cultura, patrimônio imaterial, trabalho e renda, licenciamento e compensação ambiental, desenvolvimento comunitário.",
        "Use SOMENTE editais que aparecem no texto fornecido. Nunca invente editais, órgãos, prazos, valores ou links. O link deve ser copiado exatamente de um [link] do texto.",
        "Ignore editais vencidos, sem relação com os temas ou que não aceitem organizações da sociedade civil/comunidades. Responda somente JSON válido.",
      ].join(" "),
      prompt: [
        `Hoje é ${hoje}.`,
        'Formato: {"editais":[{"titulo":"","orgao":null,"prazo":"AAAA-MM-DD ou null","link":"","abrangencia":"bacia_campos|rj|nacional","temas":["pesca|educacao_ambiental|economia_solidaria|economia_circular|cultura|patrimonio|renda|licenciamento"],"resumo":"1-2 frases","publico_elegivel":null,"valor":null}]}',
        ...paginas.map((p) => `\n=== FONTE: ${p.nome} ===\n${p.texto}`),
      ].join("\n"),
    });

    const texto = (await resultado.text).replace(/```json|```/g, "").trim();
    let itens: z.infer<typeof Item>[] = [];
    try {
      const bruto = JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1)) as { editais?: unknown[] };
      itens = (bruto.editais ?? []).flatMap((i) => { const r = Item.safeParse(i); return r.success ? [r.data] : []; });
    } catch {
      throw new Error("Não conseguimos organizar os editais encontrados. Tente novamente.");
    }

    const todoTexto = paginas.map((p) => p.texto).join(" ");
    const temasValidos = ["pesca", "educacao_ambiental", "economia_solidaria", "economia_circular", "cultura", "patrimonio", "renda", "licenciamento"];
    const verificados = itens
      .filter((i) => todoTexto.includes(i.link)) // garante que o link existe na fonte
      .filter((i) => !i.prazo || i.prazo >= hoje)
      .map((i) => ({ ...i, temas: i.temas.filter((t) => temasValidos.includes(t)), fonte: paginas.find((p) => p.texto.includes(i.link))?.nome ?? null, updated_at: new Date().toISOString() }));

    if (verificados.length) {
      const { error } = await context.supabase.from("radar_editais").upsert(verificados, { onConflict: "link" });
      if (error) { console.error(error); throw new Error("Não conseguimos salvar os editais encontrados."); }
    }
    return { encontrados: verificados.length, fontes: paginas.map((p) => p.nome) };
}
