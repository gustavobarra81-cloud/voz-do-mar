export const TIPOS_ORGANIZACAO = ["Associação", "Cooperativa", "ONG", "Empresa", "Outro"] as const;

export const CATEGORIAS_DOCUMENTO = [
  "Cartão do CNPJ",
  "Estatuto ou contrato social",
  "Ata de eleição e posse",
  "Documento de dirigente",
  "Certidão de regularidade do FGTS",
  "Certidão do INSS",
  "Certidão fiscal",
  "Comprovante de endereço",
  "Outro documento",
] as const;

export type OrganizacaoForm = {
  tipo: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  data_constituicao: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  comunidade: string;
  atividade_principal: string;
  historico: string;
  representante_nome: string;
  representante_cpf: string;
  representante_email: string;
  representante_telefone: string;
  data_eleicao: string;
  mandato_inicio: string;
  mandato_fim: string;
};

export const ORGANIZACAO_VAZIA: OrganizacaoForm = {
  tipo: "",
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  data_constituicao: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  comunidade: "",
  atividade_principal: "",
  historico: "",
  representante_nome: "",
  representante_cpf: "",
  representante_email: "",
  representante_telefone: "",
  data_eleicao: "",
  mandato_inicio: "",
  mandato_fim: "",
};

export function cadastroCompleto(org: Partial<OrganizacaoForm> | null | undefined) {
  return Boolean(
    org?.tipo &&
      org.razao_social &&
      org.cnpj &&
      org.comunidade &&
      org.atividade_principal &&
      org.representante_nome &&
      org.mandato_fim,
  );
}