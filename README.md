# Voz do Mar

Plataforma que ajuda pescadores artesanais, colônias, associações e cooperativas a encontrar editais e escrever projetos — mesmo com pouco letramento, usando a voz.

Iniciativa ligada ao PEA Pescarte (UENF/IBAMA/Petrobras), com foco nos 10 municípios da Bacia de Campos (RJ).

**Site:** https://voz-do-mar.lovable.app

## O que a plataforma faz

- **Cadastro de organizações** — uma conta pode cuidar de várias entidades (CNPJ, diretoria, mandato), com dados separados.
- **Documentos com validade** — anexa certidões e avisa quando estão perto de vencer ou vencidas.
- **Análise de edital** — lê o PDF do edital e mostra um checklist: o que a organização já cumpre e o que falta.
- **Sugestão de ideias** — se a entidade não tem ideia pronta, a ferramenta sugere 3 propostas compatíveis com o edital.
- **Entrevista por voz** — a pessoa responde falando; a ferramenta transforma em texto.
- **Redação do projeto** — gera a minuta completa, marcando com `[COMPLETAR: ...]` o que não pode ser inventado. Baixa em Word ou PDF.
- **Radar de Editais** — busca editais abertos toda segunda-feira às 07:00, com filtros por território e tema e compartilhamento no WhatsApp.
- **Aprovação de acesso** — novos cadastros só entram depois de aprovados por um administrador.

## Princípios

- Nunca inventar editais, prazos, links, experiência ou dados da organização.
- Cada usuário vê somente os próprios dados.
- Nenhum dado das organizações fica neste repositório: cadastros, documentos e projetos ficam no banco privado na nuvem.

## Tecnologia

React 19 + TanStack Start, Tailwind CSS, Lovable Cloud (banco, login e armazenamento) e IA via Lovable AI Gateway.

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) instalado.

```sh
git clone <endereço-deste-repositório>
cd <nome-da-pasta>
cp .env.example .env   # preencha os valores
npm install
npm run dev
```

As funções de IA só funcionam com a chave `LOVABLE_API_KEY` configurada no servidor.

## Editar

O projeto continua sendo editado no [Lovable](https://lovable.dev/projects/d233aef3-94df-4ea5-bb69-ca87af383366); as mudanças sincronizam automaticamente com este repositório.
