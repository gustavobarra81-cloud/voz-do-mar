import DOMPurify from "dompurify";

/** Só as etiquetas que o projeto usa. Nada de scripts, estilos ou links externos. */
const PERMITIDAS = ["p", "br", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "h4", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "mark", "colgroup", "col"];

/** Limpa o HTML antes de exibir ou salvar. No servidor (sem navegador) não devolve nada. */
export function limparHtml(html: string): string {
  if (typeof window === "undefined" || !DOMPurify.isSupported) return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: PERMITIDAS, ALLOWED_ATTR: ["colspan", "rowspan", "class"] });
}

const MARCADOR = /\[COMPLETAR:\s*([^\]]+)\]/gi;

/** Lista (sem repetir) o que ainda falta preencher. */
export function listarCompletar(html: string): string[] {
  const vistos = new Set<string>();
  const texto = html.replace(/<[^>]+>/g, " ");
  for (const m of texto.matchAll(MARCADOR)) {
    const item = (m[1] ?? "").replace(/\s+/g, " ").trim();
    if (item) vistos.add(item);
  }
  return [...vistos];
}

/** Destaca os marcadores [COMPLETAR: ...] em amarelo (só para exibir). */
export function destacarCompletar(html: string): string {
  return html.replace(MARCADOR, (t) => `<mark class="completar">${t}</mark>`);
}
