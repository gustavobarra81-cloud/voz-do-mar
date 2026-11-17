import { describe, expect, it } from "vitest";
import { destacarCompletar, listarCompletar } from "./html";

describe("marcadores COMPLETAR", () => {
  it("lista cada item que falta uma única vez", () => {
    expect(listarCompletar("<p>[COMPLETAR: valor total]</p><p>[COMPLETAR: <strong>x</strong>] [COMPLETAR: valor total] [COMPLETAR: prazo]</p>"))
      .toEqual(["valor total", "x", "prazo"]);
  });
  it("destaca o marcador", () => {
    expect(destacarCompletar("<p>Custa [COMPLETAR: valor].</p>")).toBe('<p>Custa <mark class="completar">[COMPLETAR: valor]</mark>.</p>');
  });
});
