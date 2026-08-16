import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface SenadorNormalizado {
  externalId: string;
  casa: "SENADO";
  nome: string;
  partido: string | null;
  uf: string | null;
  urlFoto: string | null;
}

interface SenadoRaw {
  ListaParlamentarEmExercicio: {
    Parlamentares: {
      Parlamentar: Array<{
        IdentificacaoParlamentar: {
          CodigoParlamentar: string;
          NomeParlamentar: string;
          SiglaPartidoParlamentar?: string;
          UfParlamentar?: string;
          UrlFotoParlamentar?: string;
        };
      }>;
    };
  };
}

export function parseSenadores(raw: SenadoRaw): SenadorNormalizado[] {
  const lista = raw.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
  return lista.map((p) => {
    const i = p.IdentificacaoParlamentar;
    return {
      externalId: String(i.CodigoParlamentar),
      casa: "SENADO" as const,
      nome: i.NomeParlamentar,
      partido: i.SiglaPartidoParlamentar ?? null,
      uf: i.UfParlamentar ?? null,
      urlFoto: i.UrlFotoParlamentar ?? null,
    };
  });
}

export async function ingestSenadores(): Promise<number> {
  const raw = await fetchJson<SenadoRaw>(
    "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json",
  );
  const senadores = parseSenadores(raw);
  for (const s of senadores) {
    await prisma.parlamentar.upsert({
      where: { casa_externalId: { casa: "SENADO", externalId: s.externalId } },
      update: { nome: s.nome, partido: s.partido, uf: s.uf, urlFoto: s.urlFoto },
      create: s,
    });
  }
  return senadores.length;
}
