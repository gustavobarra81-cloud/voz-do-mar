<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Uma conta pode possuir várias organizações; a seleção ativa é uma preferência local validada contra organizações do usuário, enquanto documentos, análises e projetos sempre usam o ID da organização selecionada. Isso impede misturar dados entre entidades.
- O contador de aprovações consulta somente o número de perfis pendentes via RLS e atualiza periodicamente ou após uma decisão administrativa. Isso mantém a navegação sincronizada sem revelar cadastros a usuários comuns.
- O Radar de Editais só grava editais cujo link aparece literalmente no texto baixado das fontes; somente administradores disparam a busca (consome IA). Isso evita editais inventados.
- Projects are written one section at a time (projetos.secoes holds each part; conteudo is rebuilt from it) so generation resumes after a closed page and single parts can be rewritten.
- Personal data (CPF, phones, e-mails, addresses, representative name) never reaches the AI: server sends an allow-list (src/lib/privacidade.ts) and the AI writes placeholders swapped for real data only on display/export.
