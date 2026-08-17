# Detalhamento por Tema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada red flag ganha uma página de detalhe por tema (cota, projetos, votações, emendas) com a lista real dos dados, mantendo os cards enxutos.

**Architecture:** Data layer agrega/pagina (Prisma groupBy/findMany) → rota Server Component `/parlamentar/[id]/[tema]` renderiza a lista no visual atual → o card ganha um link "Ver detalhes →".

**Tech Stack:** Next.js 16 App Router + TypeScript, Prisma 7/Postgres, Vitest.

---

## File Structure
```
src/data/detalhe.ts                          # detalheCota, listaProjetos, listaVotacoes, listaEmendas
src/app/parlamentar/[id]/[tema]/page.tsx     # página de detalhe por tema
src/components/RedFlagCard.tsx               # (modificar) + link "Ver detalhes"
tests/data/detalhe.test.ts
tests/app/detalhe.test.tsx
```

---

## Task 1: Data layer de detalhe

**Files:**
- Create: `src/data/detalhe.ts`
- Test: `tests/data/detalhe.test.ts`

- [ ] **Step 1: Teste de integração (falha)**

Create `tests/data/detalhe.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { detalheCota, listaProjetos, listaEmendas } from "../../src/data/detalhe";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "det-1", nome: "Detalhe Teste", uf: "SP" } });
  id = p.id;
  await prisma.despesa.createMany({ data: [
    { parlamentarId: id, ano: 2025, mes: 1, tipo: "X", fornecedorNome: "Forn A", fornecedorDoc: "1", valor: 300 },
    { parlamentarId: id, ano: 2025, mes: 2, tipo: "X", fornecedorNome: "Forn A", fornecedorDoc: "1", valor: 200 },
    { parlamentarId: id, ano: 2025, mes: 1, tipo: "Y", fornecedorNome: "Forn B", fornecedorDoc: "2", valor: 100 },
  ] });
  await prisma.proposicao.create({ data: { externalId: "det-prop-1", parlamentarId: id, tipo: "PL", ano: 2024, ementa: "Projeto de teste." } });
  await prisma.favorecido.create({ data: { parlamentarId: id, codigoEmenda: "E1", doc: "9", nome: "Benef X", tipoPessoa: "PJ", valorPago: 5000, ano: 2024 } });
});
afterAll(async () => {
  await prisma.favorecido.deleteMany({ where: { parlamentarId: id } });
  await prisma.proposicao.deleteMany({ where: { parlamentarId: id } });
  await prisma.despesa.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("detalhe", () => {
  it("detalheCota agrega por fornecedor, ordenado por total", async () => {
    const r = await detalheCota(id, 2025);
    expect(r.total).toBe(600);
    expect(r.fornecedores[0]).toMatchObject({ nome: "Forn A", total: 500, qtd: 2 });
    expect(r.fornecedores[1]).toMatchObject({ nome: "Forn B", total: 100, qtd: 1 });
  });
  it("listaProjetos retorna as proposições com total", async () => {
    const r = await listaProjetos(id, 1);
    expect(r.total).toBe(1);
    expect(r.itens[0]).toMatchObject({ tipo: "PL", ano: 2024, ementa: "Projeto de teste." });
  });
  it("listaEmendas agrega por beneficiário", async () => {
    const r = await listaEmendas(id);
    expect(r[0]).toMatchObject({ nome: "Benef X", total: 5000 });
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/data/detalhe.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/data/detalhe.ts`:
```ts
import { prisma } from "../db/client";

export interface CotaDetalhe {
  total: number;
  fornecedores: { nome: string; doc: string | null; total: number; qtd: number }[];
}

export async function detalheCota(parlamentarId: string, ano: number): Promise<CotaDetalhe> {
  const grupos = await prisma.despesa.groupBy({
    by: ["fornecedorNome", "fornecedorDoc"],
    where: { parlamentarId, ano },
    _sum: { valor: true },
    _count: { _all: true },
    orderBy: { _sum: { valor: "desc" } },
    take: 50,
  });
  const agg = await prisma.despesa.aggregate({ where: { parlamentarId, ano }, _sum: { valor: true } });
  return {
    total: agg._sum.valor ?? 0,
    fornecedores: grupos.map((g) => ({
      nome: g.fornecedorNome,
      doc: g.fornecedorDoc,
      total: g._sum.valor ?? 0,
      qtd: g._count._all,
    })),
  };
}

export interface ProjetosPagina {
  total: number;
  itens: { tipo: string; ano: number; ementa: string }[];
}

export async function listaProjetos(parlamentarId: string, pagina = 1): Promise<ProjetosPagina> {
  const [total, itens] = await Promise.all([
    prisma.proposicao.count({ where: { parlamentarId } }),
    prisma.proposicao.findMany({
      where: { parlamentarId },
      select: { tipo: true, ano: true, ementa: true },
      orderBy: [{ ano: "desc" }],
      skip: (pagina - 1) * 30,
      take: 30,
    }),
  ]);
  return { total, itens };
}

export interface VotacaoDetalhe {
  descricao: string;
  data: Date;
  voto: string;
}

export async function listaVotacoes(parlamentarId: string): Promise<VotacaoDetalhe[]> {
  const votos = await prisma.votoRegistro.findMany({
    where: { parlamentarId },
    include: { votacao: { select: { descricao: true, data: true } } },
    orderBy: { votacao: { data: "desc" } },
    take: 100,
  });
  return votos.map((v) => ({ descricao: v.votacao.descricao, data: v.votacao.data, voto: v.voto }));
}

export async function listaEmendas(
  parlamentarId: string,
): Promise<{ nome: string; doc: string; total: number }[]> {
  const grupos = await prisma.favorecido.groupBy({
    by: ["nome", "doc"],
    where: { parlamentarId },
    _sum: { valorPago: true },
    orderBy: { _sum: { valorPago: "desc" } },
    take: 50,
  });
  return grupos.map((g) => ({ nome: g.nome, doc: g.doc, total: g._sum.valorPago ?? 0 }));
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/data/detalhe.test.ts` (Postgres up)
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: data layer de detalhe (cota, projetos, votações, emendas)"
```

---

## Task 2: Página de detalhe por tema

**Files:**
- Create: `src/app/parlamentar/[id]/[tema]/page.tsx`
- Test: `tests/app/detalhe.test.tsx`

- [ ] **Step 1: Teste (falha)**

Create `tests/app/detalhe.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children?: unknown } & Record<string, unknown>) => (
    <a {...(p as Record<string, unknown>)}>{children as never}</a>
  ),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("@/data/parlamentares", () => ({
  obterPerfil: vi.fn().mockResolvedValue({ id: "1", nome: "Fulano", partido: "X", uf: "SP", casa: "CAMARA", urlFoto: null, ficha: { nivelGeral: "ok", redFlags: [] } }),
}));
vi.mock("@/data/detalhe", () => ({
  detalheCota: vi.fn().mockResolvedValue({ total: 500, fornecedores: [{ nome: "Forn A", doc: "1", total: 500, qtd: 2 }] }),
  listaProjetos: vi.fn(),
  listaVotacoes: vi.fn(),
  listaEmendas: vi.fn(),
}));

import Detalhe from "@/app/parlamentar/[id]/[tema]/page";

describe("Página de detalhe", () => {
  it("cota: mostra o fornecedor e o total", async () => {
    const el = await Detalhe({ params: Promise.resolve({ id: "1", tema: "cota" }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Forn A");
    expect(html).toContain("Fulano");
  });

  it("tema inválido → notFound", async () => {
    await expect(
      Detalhe({ params: Promise.resolve({ id: "1", tema: "xyz" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("notFound");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/app/detalhe.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/app/parlamentar/[id]/[tema]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/data/parlamentares";
import { detalheCota, listaProjetos, listaVotacoes, listaEmendas } from "@/data/detalhe";

const TEMAS = ["cota", "projetos", "votacoes", "emendas"] as const;
type Tema = (typeof TEMAS)[number];
const ANO = new Date().getFullYear() - 1;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const TITULO: Record<Tema, string> = {
  cota: "Uso da cota parlamentar",
  projetos: "Produção legislativa",
  votacoes: "Presença nas votações",
  emendas: "Destino das emendas",
};

type Props = { params: Promise<{ id: string; tema: string }>; searchParams: Promise<{ pagina?: string }> };

export default async function DetalhePage({ params, searchParams }: Props) {
  const { id, tema } = await params;
  const { pagina: paginaStr } = await searchParams;
  if (!TEMAS.includes(tema as Tema)) notFound();
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();
  const t = tema as Tema;
  const pagina = Math.max(1, Number(paginaStr) || 1);

  return (
    <main className="mx-auto w-full max-w-[900px] px-6 py-8">
      <Link href={`/parlamentar/${id}`} className="text-sm" style={{ color: "var(--ds-muted)" }}>
        ← Voltar para {perfil.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {TITULO[t]} — {perfil.nome}
      </h1>

      {t === "cota" ? <SecaoCota id={id} /> : null}
      {t === "projetos" ? <SecaoProjetos id={id} pagina={pagina} /> : null}
      {t === "votacoes" ? <SecaoVotacoes id={id} /> : null}
      {t === "emendas" ? <SecaoEmendas id={id} /> : null}
    </main>
  );
}

async function SecaoCota({ id }: { id: string }) {
  const { total, fornecedores } = await detalheCota(id, ANO);
  if (fornecedores.length === 0)
    return <p className="mt-6 text-sm" style={{ color: "var(--ds-muted)" }}>Sem gastos de cota no período.</p>;
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>Total em {ANO}: {brl(total)} · maiores fornecedores</p>
      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {fornecedores.map((f, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{f.nome}</span>
              <span className="text-xs" style={{ color: "var(--ds-muted)" }}>{f.doc ?? "—"} · {f.qtd} nota(s)</span>
            </span>
            <span className="font-semibold whitespace-nowrap">{brl(f.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs" style={{ color: "var(--ds-muted)" }}>Fonte: Câmara — CEAP (cota parlamentar).</p>
    </>
  );
}

async function SecaoProjetos({ id, pagina }: { id: string; pagina: number }) {
  const { total, itens } = await listaProjetos(id, pagina);
  if (total === 0)
    return <p className="mt-6 text-sm" style={{ color: "var(--ds-muted)" }}>Sem projetos de autoria registrados.</p>;
  const paginas = Math.ceil(total / 30);
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>{total} projeto(s) de autoria</p>
      <ul className="mt-4 flex flex-col gap-3">
        {itens.map((p, i) => (
          <li key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--ds-hair)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--ds-muted)" }}>{p.tipo} · {p.ano}</span>
            <p className="text-sm">{p.ementa}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-4 text-sm">
        {pagina > 1 ? <Link href={`?pagina=${pagina - 1}`} style={{ color: "var(--ds-primary-darker)" }}>← anterior</Link> : null}
        {pagina < paginas ? <Link href={`?pagina=${pagina + 1}`} style={{ color: "var(--ds-primary-darker)" }}>próxima →</Link> : null}
      </div>
      <p className="mt-6 text-xs" style={{ color: "var(--ds-muted)" }}>Fonte: Câmara — proposições de autoria.</p>
    </>
  );
}

const VOTO_ROTULO: Record<string, string> = { SIM: "Sim", NAO: "Não", ABSTENCAO: "Abstenção", OBSTRUCAO: "Obstrução", AUSENTE: "Ausente" };

async function SecaoVotacoes({ id }: { id: string }) {
  const votos = await listaVotacoes(id);
  if (votos.length === 0)
    return <p className="mt-6 text-sm" style={{ color: "var(--ds-muted)" }}>Sem votações nominais registradas no período.</p>;
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>
        Apenas votações nominais (com voto individual registrado). A cobertura é parcial.
      </p>
      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {votos.map((v, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0 truncate text-sm">{v.descricao}</span>
            <span className="font-semibold whitespace-nowrap">{VOTO_ROTULO[v.voto] ?? v.voto}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs" style={{ color: "var(--ds-muted)" }}>Fonte: Câmara — votações.</p>
    </>
  );
}

async function SecaoEmendas({ id }: { id: string }) {
  const benef = await listaEmendas(id);
  if (benef.length === 0)
    return <p className="mt-6 text-sm" style={{ color: "var(--ds-muted)" }}>Sem beneficiários rastreáveis. Muitas emendas vão a fundos/prefeituras, cujo fornecedor final não é público.</p>;
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>Beneficiários com valor recebido</p>
      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {benef.map((b, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{b.nome}</span>
              <span className="text-xs" style={{ color: "var(--ds-muted)" }}>{b.doc}</span>
            </span>
            <span className="font-semibold whitespace-nowrap">{brl(b.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs" style={{ color: "var(--ds-muted)" }}>Fonte: Portal da Transparência — execução de emendas.</p>
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/app/detalhe.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Full + build**

Run: `npm test` e `npx tsc --noEmit` e `npm run build`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: página de detalhe por tema (/parlamentar/[id]/[tema])"
```

---

## Task 3: Link "Ver detalhes" no card

**Files:**
- Modify: `src/components/RedFlagCard.tsx`
- Test: `tests/app/redflag-detalhe.test.tsx`

- [ ] **Step 1: Teste (falha)**

Create `tests/app/redflag-detalhe.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: unknown; href?: string }) => <a href={href as string}>{children as never}</a>,
}));
import { RedFlagCard } from "@/components/RedFlagCard";

describe("RedFlagCard ver detalhes", () => {
  it("mostra link de detalhe para o tema certo (despesas → cota)", () => {
    const html = renderToStaticMarkup(
      <RedFlagCard numero={2} idParlamentar="p1" rf={{ id: "despesas", titulo: "Uso da cota", nivel: "alerta", fraseSimples: "x", fonte: "y" }} />,
    );
    expect(html).toContain("/parlamentar/p1/cota");
    expect(html).toContain("Ver detalhes");
  });

  it("não mostra link quando sem_dado", () => {
    const html = renderToStaticMarkup(
      <RedFlagCard numero={1} idParlamentar="p1" rf={{ id: "emendas", titulo: "Emendas", nivel: "sem_dado", fraseSimples: "x", fonte: "y" }} />,
    );
    expect(html).not.toContain("Ver detalhes");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/app/redflag-detalhe.test.tsx`
Expected: FAIL (RedFlagCard não aceita idParlamentar / não tem link).

- [ ] **Step 3: Implementar**

Edit `src/components/RedFlagCard.tsx`:
- Add `import Link from "next/link";` at the top.
- Add `idParlamentar: string` to the component Props.
- Add a mapping from `rf.id` to tema:
```ts
const TEMA_POR_FLAG: Record<string, string> = {
  presenca: "votacoes",
  despesas: "cota",
  legislativa: "projetos",
  emendas: "emendas",
};
```
- Before the closing footer/`</article>`, when `rf.nivel !== "sem_dado"` and `TEMA_POR_FLAG[rf.id]` exists, render:
```tsx
<Link
  href={`/parlamentar/${idParlamentar}/${TEMA_POR_FLAG[rf.id]}`}
  className="px-5 pb-4 text-[13px] font-semibold"
  style={{ color: "var(--ds-primary-darker)" }}
>
  Ver detalhes →
</Link>
```
(Place it as the last child inside the card, after the fonte footer; adjust so it sits in the card's flex column.)

- [ ] **Step 4: Atualizar o uso do card no perfil**

In `src/app/parlamentar/[id]/page.tsx`, pass `idParlamentar={perfil.id}` (or the `id`) to each `<RedFlagCard .../>`.

- [ ] **Step 5: Rodar + tipos + build**

Run: `npm test`, `npx tsc --noEmit`, `npm run build` → verde. (Ajustar o mock/uso de RedFlagCard em `tests/app/investigacao.test.tsx`/`perfil.test.tsx` se o novo prop `idParlamentar` quebrar — passe um id fixo.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: link 'Ver detalhes' nos cards de red flag"
```

---

## Encerramento
- [ ] `npm test` verde, `npx tsc --noEmit` limpo, `npm run build` OK.
- [ ] Smoke: abrir um perfil → clicar "Ver detalhes" no card de cota → ver a lista de fornecedores; idem projetos/votações/emendas; tema inválido → 404.

## Notas
- `ANO` de referência = ano atual − 1 (mesma lógica de `ANO_REFERENCIA`); cota/emendas usam esse ano.
- Votações: cobertura parcial (só nominais ingeridas) — a página comunica isso.
- Paginação só em projetos no v1 (cota/emendas usam top-50).
```
