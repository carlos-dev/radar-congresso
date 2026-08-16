import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/data/parlamentares", () => ({
  obterPerfil: vi.fn().mockResolvedValue({
    id: "1", nome: "Fulano", partido: "XPTO", uf: "SP", casa: "CAMARA", urlFoto: null,
    ficha: {
      nivelGeral: "alerta",
      redFlags: [
        { id: "presenca", titulo: "Presença nas votações", nivel: "alerta", fraseSimples: "Faltou muito.", fonte: "Câmara" },
      ],
    },
  }),
}));

import Perfil from "../../src/app/parlamentar/[id]/page";

describe("Perfil", () => {
  it("mostra red flags, fonte e aviso de presunção de inocência", async () => {
    const el = await Perfil({ params: Promise.resolve({ id: "1" }) });
    const json = JSON.stringify(el);
    expect(json).toContain("Fulano");
    expect(json).toContain("Presença nas votações");
    expect(json).toContain("Câmara");
    expect(json).toContain("presunção de inocência");
  });
});
