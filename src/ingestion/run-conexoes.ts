import "dotenv/config";
import { prisma } from "../db/client";
import { obterConexoes, obterConexoesCota } from "../data/investigacao";
import type { Conexao } from "../analysis/conexoes";

// Recomputa o cruzamento doador↔beneficiário (emendas + cota) para todos os
// parlamentares e grava na tabela Conexao. Usa os favorecidos já ingeridos
// (arquivo em massa) e os sócios que existirem — NÃO chama API externa.
async function main() {
  const parls = await prisma.parlamentar.findMany({
    where: { doacoes: { some: {} } },
    select: { id: true, nome: true, partido: true, uf: true },
  });

  let total = 0;
  let comConexao = 0;
  const porConfianca: Record<string, number> = { alta: 0, media: 0, baixa: 0 };
  const exemplos: { nome: string; c: Conexao }[] = [];

  for (const p of parls) {
    const [emenda, cota] = await Promise.all([obterConexoes(p.id), obterConexoesCota(p.id)]);
    const cx = [...emenda, ...cota];
    await prisma.conexao.deleteMany({ where: { parlamentarId: p.id } });
    if (!cx.length) continue;
    await prisma.conexao.createMany({
      data: cx.map((c) => ({
        parlamentarId: p.id,
        tipo: c.tipo,
        doadorNome: c.doadorNome,
        doadorDoc: c.doadorDoc,
        empresaCnpj: c.empresaCnpj ?? null,
        empresaNome: c.empresaNome ?? null,
        valorDoacao: c.valorDoacao,
        valorEmenda: c.valorEmenda,
        ano: c.ano,
        confianca: c.confianca,
      })),
    });
    total += cx.length;
    comConexao++;
    for (const c of cx) porConfianca[c.confianca] = (porConfianca[c.confianca] ?? 0) + 1;
    if (exemplos.length < 20) exemplos.push({ nome: `${p.nome} (${p.partido}-${p.uf})`, c: cx[0] });
  }

  console.log(`\n=== Cruzamento concluído ===`);
  console.log(`Conexões: ${total} em ${comConexao}/${parls.length} parlamentares`);
  console.log(`Por confiança: alta=${porConfianca.alta} média=${porConfianca.media} baixa=${porConfianca.baixa}`);
  const brl = (n: number) => Math.round(n).toLocaleString("pt-BR");
  console.log(`\nExemplos:`);
  for (const e of exemplos) {
    const c = e.c;
    console.log(
      `  [${c.confianca}] ${e.nome}: doador ${c.doadorNome} (R$${brl(c.valorDoacao)}) → ` +
        `${c.tipo === "SOCIO" ? `sócio de ${c.empresaNome}` : "beneficiário"} recebeu R$${brl(c.valorEmenda)} (${c.origem})`,
    );
  }
}

main().finally(() => prisma.$disconnect());
