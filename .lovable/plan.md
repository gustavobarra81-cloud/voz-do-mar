# Plano: cadastro da organização antes da criação do projeto

## Objetivo

Reorganizar o Voz do Mar para que cada conta represente uma única ONG, cooperativa ou empresa. O usuário poderá salvar o cadastro aos poucos, anexar documentos comprobatórios, enviar um edital e receber uma comparação requisito por requisito antes de narrar a ideia do projeto.

## Novo fluxo

```text
Criar conta / entrar
        ↓
Cadastrar organização e responsáveis
        ↓
Anexar documentos e salvar como rascunho
        ↓
Enviar o PDF do edital
        ↓
Ver checklist de compatibilidade e pendências
        ↓
Contar a ideia por voz
        ↓
Gerar, revisar e baixar o projeto
```

## 1. Cadastro da organização

- Após o primeiro acesso, direcionar o usuário ao cadastro da organização, em vez de levá-lo diretamente aos projetos.
- Criar um formulário dividido em etapas simples, com salvamento contínuo e indicador do que ainda falta.
- Registrar uma organização por conta, incluindo:
  - tipo: associação, cooperativa, ONG, empresa ou outro;
  - razão social, nome de uso, CNPJ, data de constituição e contatos;
  - endereço e território/comunidade atendida;
  - atividade principal e breve histórico;
  - dados do presidente ou representante legal;
  - data da eleição, início e término do mandato;
  - demais dirigentes e responsáveis, quando houver.
- Permitir editar esses dados posteriormente em “Minha organização”.
- Exibir o estado do cadastro como rascunho ou completo, sem impedir que a pessoa salve e continue depois.

## 2. Documentos comprobatórios

- Criar uma área privada de documentos da organização.
- Aceitar PDF, JPG e PNG, com categoria, nome, data de emissão e validade quando aplicável.
- Incluir categorias iniciais adaptáveis:
  - cartão do CNPJ;
  - estatuto ou contrato social;
  - ata de eleição e posse;
  - documentos dos dirigentes;
  - certidão de regularidade do FGTS;
  - certidão do INSS e demais certidões fiscais;
  - comprovante de endereço;
  - outros documentos.
- Permitir anexar, substituir, visualizar e excluir arquivos.
- Mostrar alertas de documento ausente ou vencido.
- Manter arquivos e dados pessoais privados, acessíveis somente pela conta proprietária.

## 3. Leitura e análise do edital

- Mover o envio do edital para uma etapa posterior ao cadastro da organização.
- Guardar o PDF original do edital para consulta futura, além das informações extraídas.
- Ampliar a leitura para identificar:
  - quem pode participar;
  - exigências jurídicas, fiscais, territoriais e de experiência;
  - documentos obrigatórios;
  - impedimentos;
  - prazo, valor, contrapartida e critérios de avaliação;
  - formato e seções exigidas para o projeto.
- Comparar cada requisito com os dados e documentos cadastrados da organização.
- Apresentar somente um checklist, sem nota ou decisão automática definitiva:
  - requisito atendido;
  - requisito não comprovado ou pendente;
  - informação não localizada no edital;
  - explicação simples e indicação do dado ou documento relacionado.
- Informar claramente que o checklist auxilia a conferência, mas não substitui a validação jurídica ou do órgão responsável.
- Permitir corrigir informações extraídas do edital e atualizar a análise após completar o cadastro ou trocar um documento.

## 4. Ideia falada e geração do projeto

- Liberar a etapa da ideia depois que o usuário visualizar o checklist.
- Manter a gravação por voz e o texto editável, adaptando as perguntas às seções e critérios encontrados no edital.
- Enviar à escrita do projeto três fontes de informação:
  1. cadastro da organização;
  2. requisitos e modelo exigidos pelo edital;
  3. respostas faladas pelo usuário.
- Preencher automaticamente apenas dados comprovados no cadastro; nunca inventar informações.
- Marcar lacunas como `[COMPLETAR: informação necessária]`.
- Salvar o trabalho progressivamente para não perder edital, checklist ou respostas ao sair da página.
- Manter revisão, correção e download do projeto final.

## 5. Telas e navegação

- Atualizar o botão “Entrar” para iniciar autenticação e, no primeiro acesso, abrir o cadastro da organização.
- Acrescentar ao menu:
  - Minha organização;
  - Documentos;
  - Meus editais;
  - Meus projetos.
- Transformar “Novo projeto” em uma sequência clara: organização → edital → checklist → ideia → projeto.
- Usar textos curtos, botões grandes, progresso visível e linguagem simples, preservando o estilo marítimo atual.

## Detalhes técnicos

- Criar estruturas próprias para organização, dirigentes, documentos e análises de editais, todas vinculadas à conta e protegidas por regras de acesso.
- Relacionar editais e projetos à organização sem apagar os registros já existentes.
- Criar armazenamento privado para documentos da organização e PDFs de editais, com limite e validação de formato.
- Executar leitura e comparação com IA somente no servidor; os documentos privados e a chave de IA não serão enviados diretamente pelo navegador a serviços externos.
- Salvar o checklist estruturado por requisito, evidência, situação e observação para permitir revisão e reanálise.
- Sanitizar o conteúdo gerado antes de exibi-lo e manter tratamento claro para falhas de leitura, arquivo inválido, créditos ou indisponibilidade.
- Preservar as funções atuais de autenticação, transcrição por voz, geração, edição e download, integrando-as ao novo fluxo.

## Validação

- Testar cadastro incompleto e retomada posterior.
- Testar inclusão, substituição, visualização e remoção de cada tipo de documento.
- Testar edital compatível, edital com pendências e requisito que não possa ser confirmado.
- Confirmar que uma conta nunca acessa dados ou arquivos de outra.
- Testar no celular todo o caminho, do primeiro acesso ao projeto final.
