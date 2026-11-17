/** Dados pessoais nunca vão para a IA: ela recebe só campos permitidos e escreve marcadores. */

type Org = Record<string, unknown>;

/** Campos da organização que podem ir para a IA. */
export const CAMPOS_PERMITIDOS_IA = [
  "tipo", "razao_social", "nome_fantasia", "cnpj", "data_constituicao",
  "cidade", "estado", "comunidade", "atividade_principal", "historico",
  "data_eleicao", "mandato_inicio", "mandato_fim", "status",
] as const;

/** Marcador → campo real da organização. */
export const MARCADORES: Record<string, string> = {
  "[Nome do representante]": "representante_nome",
  "[CPF do representante]": "representante_cpf",
  "[E-mail do representante]": "representante_email",
  "[Telefone do representante]": "representante_telefone",
  "[E-mail da organização]": "email",
  "[Telefone da organização]": "telefone",
  "[Endereço da organização]": "endereco",
  "[CEP da organização]": "cep",
};

const preenchido = (v: unknown) => typeof v === "string" ? v.trim() !== "" : v != null;

/** Monta o que a IA pode ver: campos permitidos + só se cada dado pessoal existe (sim/não). */
export function organizacaoParaIA(org: Org) {
  const seguro: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERMITIDOS_IA) if (preenchido(org[campo])) seguro[campo] = org[campo];
  const cadastrados: Record<string, string> = {};
  for (const [marcador, campo] of Object.entries(MARCADORES)) cadastrados[marcador] = preenchido(org[campo]) ? "cadastrado" : "não cadastrado";
  seguro["dados_pessoais"] = cadastrados;
  return seguro;
}

export const INSTRUCAO_MARCADORES =
  `Você não recebe dados pessoais. Quando o texto precisar deles, escreva exatamente estes marcadores: ${Object.keys(MARCADORES).join(", ")}. O app troca pelos dados reais depois.`;

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Troca os marcadores pelos dados reais (só na exibição/exportação). Sem dado, mantém o marcador. */
export function substituirMarcadores(html: string, org: Org | null | undefined) {
  if (!org) return html;
  let saida = html;
  for (const [marcador, campo] of Object.entries(MARCADORES)) {
    const valor = org[campo];
    if (preenchido(valor)) saida = saida.split(marcador).join(escapar(String(valor)));
  }
  return saida;
}
