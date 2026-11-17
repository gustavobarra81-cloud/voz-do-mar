import { describe, expect, it } from "vitest";
import { organizacaoParaIA, substituirMarcadores } from "./privacidade";

const org = { razao_social: "Colônia Z-1", cnpj: "00.000.000/0001-00", representante_nome: "Maria", representante_cpf: "123.456.789-00",
  representante_email: "maria@x.com", representante_telefone: "22 99999-0000", email: "org@x.com", telefone: "22 3333", endereco: "Rua A, 1", cep: "28000-000" };

describe("privacidade", () => {
  it("nunca envia CPF, telefone, e-mail ou endereço para a IA", () => {
    const texto = JSON.stringify(organizacaoParaIA(org));
    for (const v of ["123.456.789-00", "maria@x.com", "22 99999-0000", "org@x.com", "22 3333", "Rua A, 1", "28000-000", "Maria"]) expect(texto).not.toContain(v);
    expect(texto).toContain("Colônia Z-1");
  });
  it("troca o marcador pelo CPF real na exibição", () => {
    expect(substituirMarcadores("<p>CPF: [CPF do representante]</p>", org)).toBe("<p>CPF: 123.456.789-00</p>");
  });
  it("mantém o marcador quando o dado não existe", () => {
    expect(substituirMarcadores("[CPF do representante]", { representante_cpf: "" })).toBe("[CPF do representante]");
  });
});
