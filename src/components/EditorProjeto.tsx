import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { Bold, Heading2, Heading3, List, ListOrdered, Minus, Plus, Table as TableIcon, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { valor: string; aoMudar: (html: string) => void };

function Botao({ ativo, rotulo, onClick, children }: { ativo?: boolean; rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={ativo ? "default" : "outline"} className="h-12 min-w-12 px-3 text-base" aria-label={rotulo} title={rotulo} aria-pressed={ativo} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </Button>
  );
}

function Barra({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const naTabela = editor.isActive("table");
  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-t-3xl border-b border-border bg-card p-3">
      <Botao rotulo="Negrito" ativo={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="size-5" /></Botao>
      <Botao rotulo="Título" ativo={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading2 className="size-5" /><span className="ml-1 hidden sm:inline">Título</span></Botao>
      <Botao rotulo="Subtítulo" ativo={editor.isActive("heading", { level: 4 })} onClick={() => c().toggleHeading({ level: 4 }).run()}><Heading3 className="size-5" /><span className="ml-1 hidden sm:inline">Subtítulo</span></Botao>
      <Botao rotulo="Lista com marcadores" ativo={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="size-5" /></Botao>
      <Botao rotulo="Lista numerada" ativo={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-5" /></Botao>
      <Botao rotulo="Inserir tabela" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="size-5" /><span className="ml-1 hidden sm:inline">Tabela</span></Botao>
      {naTabela && (
        <>
          <Botao rotulo="Adicionar linha" onClick={() => c().addRowAfter().run()}><Plus className="size-5" /><span className="ml-1">Linha</span></Botao>
          <Botao rotulo="Remover linha" onClick={() => c().deleteRow().run()}><Minus className="size-5" /><span className="ml-1">Linha</span></Botao>
          <Botao rotulo="Adicionar coluna" onClick={() => c().addColumnAfter().run()}><Plus className="size-5" /><span className="ml-1">Coluna</span></Botao>
        </>
      )}
      <Botao rotulo="Desfazer" onClick={() => c().undo().run()}><Undo2 className="size-5" /></Botao>
      <Botao rotulo="Refazer" onClick={() => c().redo().run()}><Redo2 className="size-5" /></Botao>
    </div>
  );
}

export function EditorProjeto({ valor, aoMudar }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false }), TableKit.configure({ table: { resizable: false } })],
    content: valor,
    editorProps: { attributes: { class: "texto-projeto min-h-[60vh] p-5 outline-none md:p-8", "aria-label": "Texto do projeto" } },
    onUpdate: ({ editor: e }) => aoMudar(e.getHTML()),
  });
  if (!editor) return <div className="min-h-[60vh] rounded-3xl bg-card shadow-soft" />;
  return (
    <div className="rounded-3xl bg-card shadow-soft ring-2 ring-primary/30">
      <Barra editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
