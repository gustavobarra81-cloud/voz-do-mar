# Escrita do projeto por partes, com retomada e "Reescrever esta parte"

## O que muda para quem usa
- Ao clicar em gerar, o projeto já aparece em "Meus projetos" como **rascunho** e a pessoa vai para a tela do projeto.
- Lá aparece o progresso: "Escrevendo 3 de 8: Metodologia", com as partes prontas já visíveis.
- Se a página fechar ou a internet cair, ao abrir o projeto de novo a escrita continua da próxima parte que falta (nada já escrito se perde nem é cobrado de novo).
- Quando todas as partes terminam, o status vira **pronto**.
- Em cada parte do projeto pronto há o botão **"Reescrever esta parte"**: abre uma caixa onde a pessoa escreve ou **fala** o que quer mudar (ex.: "deixe mais curto e cite as marisqueiras"), e só aquela parte é reescrita e salva.
- A edição manual do texto inteiro e os botões de baixar/imprimir continuam funcionando.

## Etapas
1. **Banco**: nova coluna no projeto com a lista de partes (nome, o que deve conter, limite, texto pronto ou vazio) e um campo `titulo_gerado`. Projetos antigos continuam mostrando o texto como hoje (sem botões por parte).
2. **Planejar partes (servidor)**: nova função que recebe o ID do projeto, carrega edital e organização, e monta a lista de partes: as seções exigidas pelo edital, na ordem; ou a lista padrão; mais a parte final "Como o projeto atende aos critérios de avaliação" quando houver critérios. Sem IA — custo zero.
3. **Escrever uma parte (servidor)**: `escreverSecao({ projetoId, indice, instrucao? })` carrega tudo do banco (edital com texto completo, critérios, organização, checklist da análise, respostas da comunidade e as partes já escritas, para manter coerência e não repetir), escreve **só aquela parte** respeitando seu limite e os critérios ligados a ela, salva no banco e recalcula o texto completo do projeto. A primeira parte também gera o título. Com `instrucao`, reescreve a parte considerando o pedido da pessoa e o texto atual.
4. **Tela /novo**: `finalizar()` cria o projeto em rascunho (com respostas, transcrição, análise), chama o planejamento e navega para a tela do projeto. Limpa o rascunho local.
5. **Tela do projeto**: se houver partes vazias, roda um laço que escreve uma por vez mostrando o progresso e a barra; trava contra duas abas/execuções duplicadas (só uma escrita por vez por projeto na mesma página; ao reabrir, recomeça da primeira parte vazia). Erro em uma parte mostra "Tentar de novo" sem perder as anteriores. Ao terminar, status "pronto".
6. **Reescrever esta parte**: cada parte é exibida em bloco próprio com o botão; caixa com campo de texto + botão de gravar voz (o mesmo já usado no app, transcrição existente) e "Reescrever". Mostra carregando só naquela parte.
7. **Testes**: montagem da lista de partes (ordem do edital, padrão, parte de critérios) e junção do texto final; validação no navegador gerando um projeto, recarregando no meio para conferir a retomada, e reescrevendo uma parte.

## Detalhes técnicos
- Migração aditiva: `projetos.secoes jsonb not null default '[]'` (`[{nome, conteudo, limite, html}]`). RLS existente por dono já cobre.
- Funções em `projeto.functions.ts` com `requireSupabaseAuth` + `exigirAprovacao`, lendo com o cliente do usuário (RLS). `escreverProjeto` (texto inteiro) é substituída por `planejarProjeto` + `escreverSecao`.
- `conteudo` continua sendo o HTML completo (`<h2>título</h2>` + cada parte com `<h3>`), recalculado a cada parte salva, para baixar/imprimir/editar sem mudança.
- Helpers puros em `src/lib/edital.ts` (`montarSecoes`, `juntarHtml`) com testes em `edital.test.ts`.
- Custo de IA: uma chamada por parte (mais chamadas, cada uma menor); reescrever = uma chamada.
