import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestVotacoesSenado } from "./votacoes";

async function main() {
  const janelas: [string, string][] = [];
  for (let ano = 2023; ano <= 2026; ano++) {
    janelas.push(
      [`${ano}0101`, `${ano}0301`],
      [`${ano}0301`, `${ano}0501`],
      [`${ano}0501`, `${ano}0701`],
      [`${ano}0701`, `${ano}0901`],
      [`${ano}0901`, `${ano}1101`],
      [`${ano}1101`, `${ano}1231`],
    );
  }
  let v = 0,
    votos = 0;
  for (const [ini, fim] of janelas) {
    try {
      const r = await ingestVotacoesSenado(ini, fim);
      v += r.votacoes;
      votos += r.votos;
    } catch (e) {
      console.warn(`janela ${ini}-${fim} falhou: ${(e as Error).message}`);
    }
  }
  console.log(`Senado: ${v} votações, ${votos} votos.`);
}
main().finally(() => prisma.$disconnect());
