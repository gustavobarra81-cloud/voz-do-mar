# Leitura completa do edital e projeto guiado por seções e critérios

## O que muda para quem usa
- Ao enviar o PDF, a plataforma guarda o edital inteiro e uma lista organizada com:
  - as **seções obrigatórias** do projeto (nome, o que deve conter, limite de tamanho, se houver);
  - os **critérios de avaliação** com a pontuação de cada um.
- A tela "Informações lidas no edital" passa a mostrar essas seções e critérios (só leitura) para a pessoa conferir.
- O projeto escrito segue exatamente as seções do edital, na mesma ordem e com os mesmos nomes, respeita os limites de tamanho e responde de forma explícita a cada critério de pontuação. Onde faltar informação, continua usando [COMPLETAR: ...].

## Etapas
1. **Leitura do PDF (lerEdital)**: pedir à IA, além dos campos atuais, `texto_completo` (transcrição fiel do edital) e `criterios` no formato:
   ```text
   { secoes: [{ nome, conteudo, limite }], criterios: [{ nome, descricao, pontuacao_maxima }] }
   ```
   Validar com zod; se a IA não devolver o texto, extrair do PDF via segunda resposta não é necessário — campo fica vazio e a escrita usa exigências como reserva. A tela já grava tudo o que a leitura devolve, então as novas colunas são salvas sem mudar o envio.
2. **Escrita (escreverProjeto)**: a entrada passa a ser `{ editalId, organizacaoId, checklist, respostas }`. No servidor, com o acesso do próprio usuário (respeitando as regras de privacidade), carregar o edital (título, órgão, resumo, valor, exigências, texto completo, critérios) e a organização. Erro amigável se o edital não for encontrado.
3. **Instruções de escrita**: usar texto completo + seções + critérios; uma seção `<h2>/<h3>` por seção exigida, na ordem; respeitar limites; ao final, um quadro "Como o projeto atende aos critérios de avaliação" (critério, pontuação, onde é respondido). Se não houver seções cadastradas, mantém a lista padrão atual.
4. **Tela /novo**: chamar a escrita só com os IDs; mostrar seções e critérios no cartão do edital.
5. **Editais do Radar**: não têm PDF, então continuam com seções vazias e a escrita usa a lista padrão (sem mudança de comportamento).
6. **Teste**: testar a montagem das instruções (seções na ordem, critérios presentes, reserva padrão quando vazio) e validar no navegador enviando um PDF real e gerando um projeto.

## Detalhes técnicos
- Colunas `editais.texto_completo` (text) e `editais.criterios` (jsonb, padrão `[]`) já existem — sem alteração no banco. Como `criterios` é jsonb, gravar o objeto `{secoes, criterios}`; o leitor aceita também o formato legado `[]`.
- Texto completo é limitado (~200 mil caracteres) antes de ir para a IA de escrita, para não estourar o tamanho de entrada.
- Leitura: modelo atual (`openai/gpt-6-astra`); a saída maior pode deixar a leitura alguns segundos mais lenta e consumir um pouco mais de crédito.
- Funções puras de montagem do prompt e normalização de `criterios` em `src/lib/edital.ts`, com teste em `src/lib/edital.test.ts`.
