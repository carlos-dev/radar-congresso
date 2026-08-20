export type VotoTipoSenado = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO" | "SIGILOSO";

export interface VotacaoSenado {
  externalId: string;
  data: Date;
  descricao: string;
  secreta: boolean;
  votos: { codigoParlamentar: string; voto: VotoTipoSenado }[];
}

const MAP: Record<string, VotoTipoSenado> = {
  Sim: "SIM", "Não": "NAO", Nao: "NAO", Abstenção: "ABSTENCAO", Abstencao: "ABSTENCAO",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseVotacoesSenado(json: any): VotacaoSenado[] {
  const lista = json?.ListaVotacoes?.Votacoes?.Votacao ?? [];
  const arr = Array.isArray(lista) ? lista : [lista];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((v: any) => {
    const secreta = v.Secreta === "S";
    const votosRaw = v?.Votos?.VotoParlamentar ?? [];
    const votosArr = Array.isArray(votosRaw) ? votosRaw : [votosRaw];
    return {
      externalId: String(v.CodigoSessaoVotacao),
      data: new Date(v.DataSessao),
      descricao: v.DescricaoVotacao ?? "",
      secreta,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      votos: votosArr.map((p: any) => ({
        codigoParlamentar: String(p.CodigoParlamentar),
        voto: secreta ? ("SIGILOSO" as const) : (MAP[String(p.Voto).trim()] ?? "ABSTENCAO"),
      })),
    };
  });
}
