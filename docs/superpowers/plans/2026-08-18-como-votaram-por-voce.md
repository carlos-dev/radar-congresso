# "Como votaram por você" — Plano de Implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar task a task. Os passos usam checkbox (`- [ ]`).

**Goal:** Uma página onde o cidadão escolhe seu estado e vê, por pauta que importa (Câmara + Senado), como sua bancada votou — em linguagem clara gerada por IA.

**Arquitetura:** Ingestão do Senado adiciona votações/votos nominais (marcando as secretas). Um pipeline batch de IA gera a legibilidade (`resumoCidadao`, `significadoSim/Nao`) das votações-destaque, ancorado no texto oficial. Uma camada de dados (`pautas.ts`) junta pautas + votos por UF. A página `/como-votaram` renderiza por pauta com drill-down para o boletim do perfil (já existente).

**Tech Stack:** Next.js 16 (App Router, Server Components), Prisma 7 + Postgres, tsx (ingestão), `@anthropic-ai/sdk` (Claude Haiku 4.5 no batch de legibilidade), Vitest.

---

## Estrutura de arquivos

- Modificar: `prisma/schema.prisma` (Votacao: legibilidade + `secreta`; enum Voto: `SIGILOSO`)
- Criar: `src/ingestion/senado/votacoes.ts` (parser puro + ingestão) e `run-votacoes-senado.ts`
- Criar: `src/analysis/legibilidade.ts` (prompt + validação do JSON do LLM — puro)
- Criar: `src/ingestion/legibilidade/run-legibilidade.ts` (batch que chama o Claude)
- Criar: `src/data/pautas.ts` (`pautasQueImportam`, `votosPorUf`)
- Criar: `src/app/como-votaram/page.tsx` + componente de pauta
- Modificar: `src/components/TopNav.tsx` (link) e home (entrada)
- Testes espelhando cada módulo em `tests/**`

---

## Task 1: Schema — legibilidade, voto sigiloso e votação secreta

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Passo 1: Editar o schema**

No enum `Voto`, adicionar `SIGILOSO`:
```prisma
enum Voto {
  SIM
  NAO
  ABSTENCAO
  OBSTRUCAO
  AUSENTE
  SIGILOSO
}
```
No model `Votacao`, adicionar:
```prisma
  secreta        Boolean @default(false)
  resumoCidadao  String?
  significadoSim String?
  significadoNao String?
  legibilidadeRevisada Boolean @default(false)
```

- [ ] **Passo 2: Migrar e gerar**

Run: `npx prisma migrate dev --name pautas_legibilidade && npx prisma generate`
Expected: migração aplicada, client regenerado.

- [ ] **Passo 3: Commit**
```bash
git add prisma/ && git commit -m "feat: schema para legibilidade e voto sigiloso"
```

---

## Task 2: Ingestão de votações do Senado — parser puro

**Files:**
- Create: `src/ingestion/senado/votacoes.ts`
- Test: `tests/ingestion/senado/votacoes.test.ts`

- [ ] **Passo 1: Teste do parser**

```ts
import { describe, it, expect } from "vitest";
import { parseVotacoesSenado } from "../../../src/ingestion/senado/votacoes";

const amostra = {
  ListaVotacoes: { Votacoes: { Votacao: [
    { CodigoSessaoVotacao: "6966", DataSessao: "2025-08-13", Secreta: "N",
      DescricaoVotacao: "Votação do PL 123", SiglaMateria: "PL", NumeroMateria: "123", AnoMateria: "2025",
      Votos: { VotoParlamentar: [
        { CodigoParlamentar: "22", Voto: "Sim" },
        { CodigoParlamentar: "70", Voto: "Não" },
      ] } },
    { CodigoSessaoVotacao: "9", DataSessao: "2025-08-14", Secreta: "S",
      DescricaoVotacao: "Sabatina X", Votos: { VotoParlamentar: [ { CodigoParlamentar: "22", Voto: "Votou" } ] } },
  ] } },
};

describe("parseVotacoesSenado", () => {
  it("normaliza votações e votos, marcando secretas como SIGILOSO", () => {
    const r = parseVotacoesSenado(amostra);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ externalId: "6966", secreta: false, descricao: "Votação do PL 123" });
    expect(r[0].votos).toEqual([
      { codigoParlamentar: "22", voto: "SIM" },
      { codigoParlamentar: "70", voto: "NAO" },
    ]);
    expect(r[1].secreta).toBe(true);
    expect(r[1].votos[0].voto).toBe("SIGILOSO");
  });
});
```

- [ ] **Passo 2: Rodar (falha)** — `npx vitest run tests/ingestion/senado/votacoes.test.ts` → falha (função não existe).

- [ ] **Passo 3: Implementar o parser**

```ts
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
  return arr.map((v: any) => {
    const secreta = v.Secreta === "S";
    const votosRaw = v?.Votos?.VotoParlamentar ?? [];
    const votosArr = Array.isArray(votosRaw) ? votosRaw : [votosRaw];
    return {
      externalId: String(v.CodigoSessaoVotacao),
      data: new Date(v.DataSessao),
      descricao: v.DescricaoVotacao ?? "",
      secreta,
      votos: votosArr.map((p: any) => ({
        codigoParlamentar: String(p.CodigoParlamentar),
        voto: secreta ? "SIGILOSO" : (MAP[String(p.Voto).trim()] ?? "ABSTENCAO"),
      })),
    };
  });
}
```

- [ ] **Passo 4: Rodar (passa)** — mesmo comando → PASS.

- [ ] **Passo 5: Commit** — `git add ... && git commit -m "feat: parser de votações do Senado"`

---

## Task 3: Ingestão do Senado — persistência + runner

**Files:**
- Modify: `src/ingestion/senado/votacoes.ts` (adicionar `ingestVotacoesSenado`)
- Create: `src/ingestion/senado/run-votacoes-senado.ts`

- [ ] **Passo 1: Descobrir o endpoint atual**

Rodar manualmente e inspecionar (o endpoint por intervalo está descontinuado; confirmar o substituto):
```bash
curl -s -H "Accept: application/json" "https://legis.senado.leg.br/dadosabertos/plenario/lista/votacao/20250701/20250831" | head -c 300
```
Se o substituto `/dadosabertos/votacao` exigir outros parâmetros, ajustar a URL no runner. Documentar a URL escolhida no topo do arquivo.

- [ ] **Passo 2: Implementar `ingestVotacoesSenado`**

```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

const BASE = "https://legis.senado.leg.br/dadosabertos";

export async function ingestVotacoesSenado(dataInicio: string, dataFim: string): Promise<{ votacoes: number; votos: number }> {
  const raw = await fetchJson<unknown>(
    `${BASE}/plenario/lista/votacao/${dataInicio}/${dataFim}`,
    { headers: { Accept: "application/json" } },
  );
  const votacoes = parseVotacoesSenado(raw);

  const senadores = await prisma.parlamentar.findMany({ where: { casa: "SENADO" }, select: { id: true, externalId: true } });
  const pidPorExternal = new Map(senadores.map((s) => [s.externalId, s.id]));

  let totalVotos = 0;
  for (const v of votacoes) {
    const votacao = await prisma.votacao.upsert({
      where: { externalId: v.externalId },
      update: { descricao: v.descricao, data: v.data, secreta: v.secreta },
      create: { externalId: v.externalId, casa: "SENADO", data: v.data, descricao: v.descricao, secreta: v.secreta },
    });
    await prisma.votoRegistro.deleteMany({ where: { votacaoId: votacao.id } });
    const regs = v.votos
      .map((x) => ({ votacaoId: votacao.id, parlamentarId: pidPorExternal.get(x.codigoParlamentar), voto: x.voto }))
      .filter((r): r is { votacaoId: string; parlamentarId: string; voto: typeof r.voto } => Boolean(r.parlamentarId));
    if (regs.length) { await prisma.votoRegistro.createMany({ data: regs, skipDuplicates: true }); totalVotos += regs.length; }
  }
  return { votacoes: votacoes.length, votos: totalVotos };
}
```
NOTA: se `CodigoParlamentar` do Senado não bater com `externalId` do senador na base (checar como `ingestSenadores` gravou o id), casar por esse campo — ajustar `pidPorExternal` de acordo. Confirmar com uma query antes de rodar em massa.

- [ ] **Passo 3: Runner**

```ts
import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestVotacoesSenado } from "./votacoes";

// Uso: tsx run-votacoes-senado.ts  (varre o mandato em janelas de 60 dias)
async function main() {
  const janelas: [string, string][] = [];
  for (let ano = 2023; ano <= 2026; ano++) {
    janelas.push([`${ano}0101`, `${ano}0301`], [`${ano}0301`, `${ano}0501`], [`${ano}0501`, `${ano}0701`],
                 [`${ano}0701`, `${ano}0901`], [`${ano}0901`, `${ano}1101`], [`${ano}1101`, `${ano}1231`]);
  }
  let v = 0, votos = 0;
  for (const [ini, fim] of janelas) {
    try { const r = await ingestVotacoesSenado(ini, fim); v += r.votacoes; votos += r.votos; }
    catch (e) { console.warn(`janela ${ini}-${fim} falhou: ${(e as Error).message}`); }
  }
  console.log(`Senado: ${v} votações, ${votos} votos.`);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Passo 4: Verificar id do senador e rodar**

```bash
npx tsx src/ingestion/senado/run-votacoes-senado.ts
```
Expected: log com contagem > 0. Conferir no banco: `votacao where casa=SENADO com votos`.

- [ ] **Passo 5: Commit** — `git add ... && git commit -m "feat: ingestão de votações do Senado"`

---

## Task 4: Legibilidade por IA — função pura (prompt + validação)

**Files:**
- Create: `src/analysis/legibilidade.ts`
- Test: `tests/analysis/legibilidade.test.ts`

- [ ] **Passo 1: Teste**

```ts
import { describe, it, expect } from "vitest";
import { montarPromptLegibilidade, parseLegibilidade } from "../../src/analysis/legibilidade";

describe("legibilidade", () => {
  it("monta prompt ancorado no texto oficial", () => {
    const p = montarPromptLegibilidade({ descricao: "Aprovado o Substitutivo à PEC 45", tipo: "PEC", resultado: "aprovada" });
    expect(p).toContain("PEC 45");
    expect(p).toMatch(/JSON/i);
  });
  it("valida e normaliza o JSON do LLM", () => {
    const raw = '{"resumoCidadao":"Muda impostos.","significadoSim":"A favor.","significadoNao":"Contra."}';
    const r = parseLegibilidade(raw);
    expect(r).toEqual({ resumoCidadao: "Muda impostos.", significadoSim: "A favor.", significadoNao: "Contra." });
  });
  it("rejeita JSON incompleto", () => {
    expect(parseLegibilidade('{"resumoCidadao":"x"}')).toBeNull();
    expect(parseLegibilidade("não é json")).toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar (falha).**

- [ ] **Passo 3: Implementar**

```ts
export interface LegibilidadeInput { descricao: string; tipo: string | null; resultado: string | null }
export interface Legibilidade { resumoCidadao: string; significadoSim: string; significadoNao: string }

export function montarPromptLegibilidade(i: LegibilidadeInput): string {
  return [
    "Você traduz votações do Congresso para linguagem cidadã simples, sem juridiquês.",
    "Baseie-se APENAS no texto oficial abaixo. Não invente fatos nem a direção do voto.",
    `Tipo: ${i.tipo ?? "?"} | Resultado: ${i.resultado ?? "?"}`,
    `Texto oficial: """${i.descricao}"""`,
    'Responda SÓ com JSON: {"resumoCidadao": "1-2 frases do que a matéria trata", ' +
      '"significadoSim": "o que votar Sim representou", "significadoNao": "o que votar Não representou"}',
  ].join("\n");
}

export function parseLegibilidade(raw: string): Legibilidade | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]);
    const ok = ["resumoCidadao", "significadoSim", "significadoNao"].every((k) => typeof o[k] === "string" && o[k].trim());
    return ok ? { resumoCidadao: o.resumoCidadao.trim(), significadoSim: o.significadoSim.trim(), significadoNao: o.significadoNao.trim() } : null;
  } catch {
    return null;
  }
}
```

- [ ] **Passo 4: Rodar (passa).**
- [ ] **Passo 5: Commit** — `git commit -m "feat: função de legibilidade (prompt + validação)"`

---

## Task 5: Batch de legibilidade (chama o Claude)

**Files:**
- Create: `src/ingestion/legibilidade/run-legibilidade.ts`
- Modify: `package.json` (dep `@anthropic-ai/sdk`), `.env` (ANTHROPIC_API_KEY)

- [ ] **Passo 1: Instalar SDK** — `npm i @anthropic-ai/sdk` e garantir `ANTHROPIC_API_KEY` no `.env`.

- [ ] **Passo 2: Runner (batch sobre as votações-destaque)**

```ts
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../db/client";
import { montarPromptLegibilidade, parseLegibilidade } from "../../analysis/legibilidade";

const client = new Anthropic();
const resultadoDe = (d: string) => (/^aprovad/i.test(d) ? "aprovada" : /^rejeitad/i.test(d) ? "rejeitada" : null);

async function main() {
  // apenas as que serão exibidas (destaque != false) e ainda sem legibilidade
  const vs = await prisma.votacao.findMany({
    where: { NOT: { destaque: false }, resumoCidadao: null, secreta: false },
    select: { id: true, descricao: true, tipo: true },
    take: 200,
  });
  for (const v of vs) {
    const prompt = montarPromptLegibilidade({ descricao: v.descricao, tipo: v.tipo, resultado: resultadoDe(v.descricao) });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const texto = resp.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const leg = parseLegibilidade(texto);
    if (leg) await prisma.votacao.update({ where: { id: v.id }, data: leg });
    else console.warn(`legibilidade inválida para ${v.id}`);
  }
  console.log(`Legibilidade gerada para ${vs.length} votações.`);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Passo 3: Rodar e conferir** — `npx tsx src/ingestion/legibilidade/run-legibilidade.ts`; conferir alguns registros no banco. Revisar manualmente as marcantes e marcar `legibilidadeRevisada = true` (via a curadoria em `src/data/curadoria-votacoes.ts`, estendida com esses campos — opcional neste passo).

- [ ] **Passo 4: Commit** — `git commit -m "feat: batch de legibilidade via Claude"`

---

## Task 6: Camada de dados das pautas

**Files:**
- Create: `src/data/pautas.ts`
- Test: `tests/data/pautas.test.ts`

- [ ] **Passo 1: Teste (integração)** — cria 1 parlamentar CAMARA UF=PE + 1 votação destaque com legibilidade + 1 voto; asserta que `pautasQueImportam` traz a pauta e `votosPorUf([id], "PE")` agrupa o voto do parlamentar de PE.

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { pautasQueImportam, votosPorUf } from "../../src/data/pautas";

let pid: string, vid: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "pauta-dep", nome: "Dep PE", uf: "PE" } });
  pid = p.id;
  const v = await prisma.votacao.create({ data: { externalId: "pauta-vot", casa: "CAMARA", data: new Date("2025-01-01"), descricao: "d", destaque: true, resumoCidadao: "resumo", significadoSim: "sim", significadoNao: "nao", votosSim: 300, votosNao: 100 } });
  vid = v.id;
  await prisma.votoRegistro.create({ data: { votacaoId: vid, parlamentarId: pid, voto: "SIM" } });
});
afterAll(async () => {
  await prisma.votoRegistro.deleteMany({ where: { parlamentarId: pid } });
  await prisma.votacao.delete({ where: { id: vid } });
  await prisma.parlamentar.delete({ where: { id: pid } });
});

describe("pautas", () => {
  it("pautasQueImportam traz a votação-destaque com legibilidade", async () => {
    const r = await pautasQueImportam(50);
    const p = r.find((x) => x.id === vid);
    expect(p?.resumoCidadao).toBe("resumo");
  });
  it("votosPorUf agrupa por voto os parlamentares do estado", async () => {
    const r = await votosPorUf([vid], "PE");
    expect(r[vid].SIM.map((x) => x.nome)).toContain("Dep PE");
  });
});
```

- [ ] **Passo 2: Rodar (falha).**

- [ ] **Passo 3: Implementar**

```ts
import { prisma } from "../db/client";
import { scoreImportancia } from "../analysis/importancia";

export interface Pauta {
  id: string; casa: string; data: Date; titulo: string;
  resumoCidadao: string | null; significadoSim: string | null; significadoNao: string | null;
  secreta: boolean; revisada: boolean;
}
export interface VotoDoParlamentar { id: string; nome: string; partido: string | null; uf: string | null; casa: string }

export async function pautasQueImportam(limite = 20): Promise<Pauta[]> {
  const vs = await prisma.votacao.findMany({
    where: { votos: { some: {} }, NOT: { destaque: false } },
    select: { id: true, casa: true, data: true, descricao: true, titulo: true, destaque: true,
      resumoCidadao: true, significadoSim: true, significadoNao: true, secreta: true, legibilidadeRevisada: true,
      tipo: true, votosSim: true, votosNao: true, votosOutros: true },
  });
  return vs
    .map((v) => ({ v, score: (v.destaque ? 1 : 0) + scoreImportancia(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ v }) => ({
      id: v.id, casa: v.casa, data: v.data, titulo: v.titulo ?? v.descricao.slice(0, 90),
      resumoCidadao: v.resumoCidadao, significadoSim: v.significadoSim, significadoNao: v.significadoNao,
      secreta: v.secreta, revisada: v.legibilidadeRevisada,
    }));
}

export async function votosPorUf(votacaoIds: string[], uf: string): Promise<Record<string, Record<string, VotoDoParlamentar[]>>> {
  const regs = await prisma.votoRegistro.findMany({
    where: { votacaoId: { in: votacaoIds }, parlamentar: { uf } },
    select: { votacaoId: true, voto: true, parlamentar: { select: { id: true, nome: true, partido: true, uf: true, casa: true } } },
  });
  const out: Record<string, Record<string, VotoDoParlamentar[]>> = {};
  for (const id of votacaoIds) out[id] = {};
  for (const r of regs) {
    (out[r.votacaoId][r.voto] ??= []).push(r.parlamentar);
  }
  return out;
}
```

- [ ] **Passo 4: Rodar (passa).**
- [ ] **Passo 5: Commit** — `git commit -m "feat: camada de dados das pautas"`

---

## Task 7: Página /como-votaram

**Files:**
- Create: `src/app/como-votaram/page.tsx`
- Test: `tests/app/como-votaram.test.tsx`

- [ ] **Passo 1: Teste (render, mockado)** — mocka `@/data/pautas` (uma pauta com resumo + votos por UF) e `next/link`; renderiza a página com `searchParams uf=PE`; asserta título da pauta, resumo, "Sim significou", e um nome na coluna Sim.

- [ ] **Passo 2: Implementar a página**

Server Component: lê `searchParams.uf`; se ausente, mostra o seletor de UF (links `?uf=XX` para as 27 UFs). Com UF: `const pautas = await pautasQueImportam(); const votos = await votosPorUf(pautas.map(p=>p.id), uf);` e renderiza, por pauta:
- título (+ selo "revisado" se `revisada`);
- `resumoCidadao`; linhas "Votar Sim significou: …" / "Votar Não significou: …";
- se `secreta`: aviso "voto sigiloso — o Senado não divulga o voto individual";
- senão: grupos Sim / Não / Abstenção / Faltou (derivar faltou = bancada da UF sem registro — opcional no v1), cada nome é `Link` para `/parlamentar/[id]`.
Aviso de rodapé com as limitações (Senado secreto/menos votações; IA revisada só nas marcantes). `export const dynamic = "force-dynamic"`.

- [ ] **Passo 3: Rodar testes (passam).**
- [ ] **Passo 4: Commit** — `git commit -m "feat: página como-votaram por pauta"`

---

## Task 8: Entradas de navegação

**Files:**
- Modify: `src/components/TopNav.tsx` (link "Como votaram")
- Modify: `src/app/page.tsx` (chamada/destaque para a feature)

- [ ] **Passo 1: Adicionar link no TopNav** para `/como-votaram`.
- [ ] **Passo 2: Destaque na home** (um bloco/CTA "Veja como seus representantes votaram → escolha seu estado").
- [ ] **Passo 3: `npm run build`** — Expected: rota `/como-votaram` listada.
- [ ] **Passo 4: Commit** — `git commit -m "feat: navegação para como-votaram"`

---

## Task 9: Verificação end-to-end

- [ ] `npx tsc --noEmit` limpo.
- [ ] `npx vitest run` — tudo verde.
- [ ] `npm run build` — sem erros; `/como-votaram` presente.
- [ ] Subir dev, abrir `/como-votaram?uf=PE`, conferir pautas com linguagem clara + votos da bancada de PE + drill-down funcionando.
- [ ] Commit final e push.
