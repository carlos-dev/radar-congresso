import type { Nivel, RedFlag } from "./types";
import { redFlagPresenca, type PresencaInput } from "./presenca";
import { redFlagDespesas, type DespesasInput } from "./despesas";
import { redFlagEmendas, type EmendasInput } from "./emendas";
import { redFlagLegislativa, type LegislativaInput } from "./legislativa";

export interface FichaInput {
  presenca: PresencaInput;
  despesas: DespesasInput;
  emendas: EmendasInput;
  legislativa: LegislativaInput;
}

export interface Ficha {
  nivelGeral: Nivel;
  redFlags: RedFlag[];
}

function pior(a: Nivel, b: Nivel): Nivel {
  const ordem: Nivel[] = ["sem_dado", "ok", "atencao", "alerta"];
  return ordem.indexOf(a) >= ordem.indexOf(b) ? a : b;
}

export function montarFicha(i: FichaInput): Ficha {
  const redFlags: RedFlag[] = [
    redFlagPresenca(i.presenca),
    redFlagDespesas(i.despesas),
    redFlagEmendas(i.emendas),
    redFlagLegislativa(i.legislativa),
  ];
  // Nível geral = o pior entre os sinais QUE TÊM dado. Se nenhum sinal tem
  // dado, o geral é "sem_dado" (não "ok") — não temos base para dizer que
  // está tudo certo, apenas que faltam dados.
  const comDado = redFlags.filter((rf) => rf.nivel !== "sem_dado");
  const nivelGeral: Nivel =
    comDado.length === 0 ? "sem_dado" : comDado.reduce<Nivel>((acc, rf) => pior(acc, rf.nivel), "ok");
  return { nivelGeral, redFlags };
}
