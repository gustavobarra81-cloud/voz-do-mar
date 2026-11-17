// Gera um .docx real a partir do HTML do projeto (títulos, parágrafos, listas e tabelas).
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

const LARGURA = 9026; // A4 com margens de 2,54 cm
const borda = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

type Estilo = { bold?: boolean; italics?: boolean; underline?: boolean };

function runs(no: Node, estilo: Estilo = {}): TextRun[] {
  if (no.nodeType === Node.TEXT_NODE) {
    const t = (no.textContent ?? "").replace(/\s+/g, " ");
    return t ? [new TextRun({ text: t, ...(estilo.bold ? { bold: true } : {}), ...(estilo.italics ? { italics: true } : {}), ...(estilo.underline ? { underline: {} } : {}) })] : [];
  }
  if (!(no instanceof Element)) return [];
  const tag = no.tagName.toLowerCase();
  if (tag === "br") return [new TextRun({ text: "", break: 1 })];
  const novo = { ...estilo };
  if (tag === "strong" || tag === "b") novo.bold = true;
  if (tag === "em" || tag === "i") novo.italics = true;
  if (tag === "u") novo.underline = true;
  return [...no.childNodes].flatMap((c) => runs(c, novo));
}

function celula(td: Element, cabecalho: boolean, largura: number) {
  const blocos = [...td.children].some((c) => ["p", "ul", "ol"].includes(c.tagName.toLowerCase()))
    ? [...td.children].flatMap((c) => blocosDe(c))
    : [new Paragraph({ children: runs(td, cabecalho ? { bold: true } : {}) })];
  return new TableCell({
    borders: bordas,
    width: { size: largura, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    ...(cabecalho ? { shading: { fill: "E3EEF3", type: ShadingType.CLEAR } } : {}),
    ...(Number(td.getAttribute("colspan")) > 1 ? { columnSpan: Number(td.getAttribute("colspan")) } : {}),
    children: blocos.length ? (blocos as Paragraph[]) : [new Paragraph("")],
  });
}

function tabela(el: Element): Table {
  const linhas = [...el.querySelectorAll("tr")];
  const colunas = Math.max(1, ...linhas.map((tr) => [...tr.children].reduce((n, c) => n + (Number(c.getAttribute("colspan")) || 1), 0)));
  const largura = Math.floor(LARGURA / colunas);
  return new Table({
    width: { size: largura * colunas, type: WidthType.DXA },
    columnWidths: Array.from({ length: colunas }, () => largura),
    rows: linhas.map((tr) => new TableRow({
      children: [...tr.children].map((td) => celula(td, td.tagName.toLowerCase() === "th", largura * (Number(td.getAttribute("colspan")) || 1))),
    })),
  });
}

function blocosDe(el: Element): (Paragraph | Table)[] {
  const tag = el.tagName.toLowerCase();
  const titulos: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_1, h3: HeadingLevel.HEADING_2, h4: HeadingLevel.HEADING_3 };
  if (titulos[tag]) return [new Paragraph({ heading: titulos[tag], children: runs(el) })];
  if (tag === "p" || tag === "blockquote") return [new Paragraph({ children: runs(el), spacing: { after: 120 } })];
  if (tag === "ul" || tag === "ol") {
    return [...el.children].filter((li) => li.tagName.toLowerCase() === "li").map((li) =>
      new Paragraph({ numbering: { reference: tag === "ul" ? "marcadores" : "numeros", level: 0 }, children: runs(li) }));
  }
  if (tag === "table") return [tabela(el), new Paragraph("")];
  if (["thead", "tbody", "div", "section", "article"].includes(tag)) return [...el.children].flatMap(blocosDe);
  const r = runs(el);
  return r.length ? [new Paragraph({ children: r })] : [];
}

export async function htmlParaDocx(titulo: string, html: string): Promise<Blob> {
  const corpo = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const filhos = [...corpo.children].flatMap(blocosDe);
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", run: { size: 36, bold: true, font: "Arial" }, paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: "Arial" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial" }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "marcadores", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(titulo)] }), ...filhos],
    }],
  });
  return Packer.toBlob(doc);
}
