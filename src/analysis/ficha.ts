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
  const nivelGeral = redFlags.reduce<Nivel>((acc, rf) => pior(acc, rf.nivel), "sem_dado");
  return { nivelGeral: nivelGeral === "sem_dado" ? "ok" : nivelGeral, redFlags };
}
