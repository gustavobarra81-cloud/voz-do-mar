export const ABRANGENCIAS = [
  { id: "bacia_campos", rotulo: "Bacia de Campos" },
  { id: "rj", rotulo: "Estado do RJ" },
  { id: "nacional", rotulo: "Nacional" },
] as const;

export const TEMAS = [
  { id: "pesca", rotulo: "Pesca artesanal e costeiro" },
  { id: "educacao_ambiental", rotulo: "Educação ambiental" },
  { id: "economia_solidaria", rotulo: "Economia solidária e cooperativismo" },
  { id: "economia_circular", rotulo: "Economia circular" },
  { id: "cultura", rotulo: "Arte e cultura" },
  { id: "patrimonio", rotulo: "Patrimônio imaterial" },
  { id: "renda", rotulo: "Trabalho e renda" },
  { id: "licenciamento", rotulo: "Licenciamento e compensação" },
] as const;

export type RadarEdital = {
  id: string; titulo: string; orgao: string | null; prazo: string | null; link: string;
  abrangencia: string; temas: string[]; resumo: string | null; publico_elegivel: string | null;
  valor: string | null; fonte: string | null;
};

export type FiltrosRadar = { abrangencias: string[]; temas: string[]; busca: string };

/** Dias até o prazo (0 = hoje). null quando o edital não informa prazo. */
export function diasRestantes(prazo: string | null, hoje = new Date()): number | null {
  if (!prazo) return null;
  const [a = 0, m = 1, d = 1] = prazo.split("-").map(Number);
  const fim = Date.UTC(a, m - 1, d);
  const inicio = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((fim - inicio) / 86_400_000);
}

export function urgente(prazo: string | null, hoje = new Date()) {
  const dias = diasRestantes(prazo, hoje);
  return dias !== null && dias >= 0 && dias <= 10;
}

function normalizar(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Filtros combinados: território E tema E busca. Dentro de cada grupo, basta um coincidir. Vencidos saem. */
export function filtrarRadar(lista: RadarEdital[], f: FiltrosRadar, hoje = new Date()) {
  const termo = normalizar(f.busca.trim());
  return lista
    .filter((e) => { const d = diasRestantes(e.prazo, hoje); return d === null || d >= 0; })
    .filter((e) => f.abrangencias.length === 0 || f.abrangencias.includes(e.abrangencia))
    .filter((e) => f.temas.length === 0 || e.temas.some((t) => f.temas.includes(t)))
    .filter((e) => !termo || normalizar([e.titulo, e.orgao, e.resumo, e.publico_elegivel].filter(Boolean).join(" ")).includes(termo))
    .sort((a, b) => (a.prazo ?? "9999-12-31").localeCompare(b.prazo ?? "9999-12-31"));
}

function formatarData(prazo: string) {
  const [a, m, d] = prazo.split("-"); return `${d}/${m}/${a}`;
}

export function mensagemWhatsApp(e: RadarEdital, hoje = new Date()) {
  const dias = diasRestantes(e.prazo, hoje);
  const linhas = [
    "🌊 Oportunidade de edital encontrada no Voz do Mar:", "",
    `📌 Edital: ${e.titulo}`,
    e.orgao ? `🏛️ Órgão: ${e.orgao}` : null,
    e.prazo ? `⏳ Prazo de inscrição: até ${formatarData(e.prazo)}${dias !== null ? ` (faltam ${dias} dia${dias === 1 ? "" : "s"})` : ""}` : "⏳ Prazo: confira no edital",
    e.publico_elegivel ? `👥 Quem pode concorrer: ${e.publico_elegivel}` : null,
    e.valor ? `💰 Apoio: ${e.valor}` : null,
    "", `🔗 Edital completo: ${e.link}`,
  ];
  return linhas.filter((l) => l !== null).join("\n");
}

export function linkWhatsApp(e: RadarEdital, hoje = new Date()) {
  return `https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp(e, hoje))}`;
}
