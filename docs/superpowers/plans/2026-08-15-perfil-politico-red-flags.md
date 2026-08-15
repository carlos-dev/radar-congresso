# Perfil do Político com Red Flags — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app onde o cidadão busca um deputado federal ou senador e vê um perfil em linguagem simples com sinais de alerta (red flags) calculados de dados abertos oficiais.

**Architecture:** Jobs de ingestão baixam e normalizam dados abertos → Postgres (via Prisma) → camada de análise (funções puras que calculam red flags) → Next.js (App Router, Server Components) renderiza busca e perfis. Cada fonte de dados é isolada num módulo próprio; a normalização é separada do I/O para ser testável.

**Tech Stack:** Next.js (App Router) + TypeScript + React, Postgres + Prisma, Vitest para testes, Docker Compose para o Postgres local.

---

## File Structure

```
radar-congresso/
├── docker-compose.yml                 # Postgres local
├── .env.example                       # DATABASE_URL, PORTAL_TRANSPARENCIA_API_KEY
├── package.json
├── vitest.config.ts
├── prisma/
│   └── schema.prisma                  # modelos
├── src/
│   ├── lib/
│   │   └── http.ts                    # fetch com retry (compartilhado)
│   ├── db/
│   │   └── client.ts                  # PrismaClient singleton
│   ├── ingestion/
│   │   ├── camara/
│   │   │   ├── deputados.ts           # parse + ingest deputados
│   │   │   ├── despesas.ts            # parse + ingest CEAP
│   │   │   ├── votacoes.ts            # parse + ingest votações/votos
│   │   │   └── proposicoes.ts         # parse + ingest proposições
│   │   ├── senado/
│   │   │   └── senadores.ts
│   │   ├── transparencia/
│   │   │   └── emendas.ts
│   │   └── run-all.ts                 # orquestrador
│   ├── analysis/
│   │   ├── types.ts                   # RedFlag, Ficha
│   │   ├── presenca.ts
│   │   ├── despesas.ts
│   │   ├── emendas.ts
│   │   ├── legislativa.ts
│   │   └── ficha.ts                   # agrega tudo
│   ├── data/
│   │   └── parlamentares.ts           # data access p/ o front
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                   # busca/lista
│       └── parlamentar/[id]/page.tsx  # perfil
└── tests/
    ├── ingestion/…                    # testa parse com fixtures
    └── analysis/…                     # testa funções puras
```

**Princípio-chave:** cada ingestão é dividida em `parseX(raw)` (função pura, testada) + `ingestX(deps)` (thin: fetch + upsert). Os red flags são funções puras que recebem dados já agregados.

---

## Task 1: Scaffold do projeto (Next.js + TypeScript + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `next.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `tests/smoke.test.ts`

- [ ] **Step 1: Inicializar Next.js + deps**

Run:
```bash
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --eslint --use-npm --no-import-alias --no-turbopack
npm install -D vitest @vitest/coverage-v8
npm install @prisma/client
npm install -D prisma
```
Aceite sobrescrever arquivos se perguntar. Se `create-next-app` recusar por diretório não-vazio, mova temporariamente a pasta `docs/` para fora, rode, e devolva.

- [ ] **Step 2: Configurar Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { provider: "v8" },
  },
});
```

Add scripts em `package.json` (`"scripts"`):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Escrever teste smoke que falha**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { appName } from "../src/lib/meta";

describe("smoke", () => {
  it("expõe o nome do app", () => {
    expect(appName()).toBe("radar-congresso");
  });
});
```

- [ ] **Step 4: Rodar teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/meta'`

- [ ] **Step 5: Implementar o mínimo**

Create `src/lib/meta.ts`:
```ts
export function appName(): string {
  return "radar-congresso";
}
```

- [ ] **Step 6: Rodar teste e confirmar que passa**

Run: `npm test`
Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Vitest"
```

---

## Task 2: Postgres local + Prisma schema

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `.env`, `prisma/schema.prisma`, `src/db/client.ts`
- Test: `tests/db/client.test.ts`

- [ ] **Step 1: Docker Compose do Postgres**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: radar
      POSTGRES_PASSWORD: radar
      POSTGRES_DB: radar
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Create `.env.example`:
```
DATABASE_URL="postgresql://radar:radar@localhost:5432/radar?schema=public"
PORTAL_TRANSPARENCIA_API_KEY=""
```

Copie para `.env`: `cp .env.example .env`. Suba o banco: `docker compose up -d`.

- [ ] **Step 2: Definir o schema Prisma**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Casa {
  CAMARA
  SENADO
}

enum Voto {
  SIM
  NAO
  ABSTENCAO
  OBSTRUCAO
  AUSENTE
}

model Parlamentar {
  id          String   @id @default(cuid())
  externalId  String
  casa        Casa
  nome        String
  nomeCivil   String?
  partido     String?
  uf          String?
  cargo       String?
  urlFoto     String?
  despesas    Despesa[]
  votos       VotoRegistro[]
  proposicoes Proposicao[]
  emendas     Emenda[]

  @@unique([casa, externalId])
}

model Despesa {
  id             String      @id @default(cuid())
  parlamentar    Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId  String
  ano            Int
  mes            Int
  tipo           String
  fornecedorNome String
  fornecedorDoc  String?
  valor          Float
  @@index([parlamentarId, ano])
}

model Votacao {
  id         String         @id @default(cuid())
  externalId String         @unique
  data       DateTime
  descricao  String
  votos      VotoRegistro[]
}

model VotoRegistro {
  id            String      @id @default(cuid())
  votacao       Votacao     @relation(fields: [votacaoId], references: [id])
  votacaoId     String
  parlamentar   Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId String
  voto          Voto
  @@unique([votacaoId, parlamentarId])
}

model Proposicao {
  id            String      @id @default(cuid())
  externalId    String      @unique
  parlamentar   Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId String
  tipo          String
  ano           Int
  ementa        String
  virouLei      Boolean     @default(false)
  @@index([parlamentarId])
}

model Emenda {
  id                    String      @id @default(cuid())
  parlamentar           Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId         String
  ano                   Int
  funcao                String?
  municipioBeneficiario String?
  uf                    String?
  beneficiarioDoc       String?
  valorEmpenhado        Float       @default(0)
  valorPago             Float       @default(0)
  @@index([parlamentarId, ano])
}
```

- [ ] **Step 3: Gerar client e aplicar migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: cria `prisma/migrations/…/migration.sql` e gera o client sem erro.

- [ ] **Step 4: Escrever teste do client (falha)**

Create `src/db/client.ts` ainda NÃO — primeiro o teste.
Create `tests/db/client.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { prisma } from "../../src/db/client";

describe("db client", () => {
  it("conecta e conta parlamentares", async () => {
    const count = await prisma.parlamentar.count();
    expect(typeof count).toBe("number");
  });
});
```

- [ ] **Step 5: Rodar e confirmar falha**

Run: `npm test tests/db/client.test.ts`
Expected: FAIL — módulo `src/db/client` não existe.

- [ ] **Step 6: Implementar o client singleton**

Create `src/db/client.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 7: Rodar e confirmar passa**

Run: `npm test tests/db/client.test.ts` (com `docker compose up -d` ativo)
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: postgres + prisma schema"
```

---

## Task 3: Helper HTTP com retry (compartilhado)

**Files:**
- Create: `src/lib/http.ts`
- Test: `tests/lib/http.test.ts`

- [ ] **Step 1: Teste que falha**

Create `tests/lib/http.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { fetchJson } from "../../src/lib/http";

describe("fetchJson", () => {
  it("retorna JSON no sucesso", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    });
    const data = await fetchJson("http://x", {}, fakeFetch as unknown as typeof fetch);
    expect(data).toEqual({ hello: "world" });
  });

  it("tenta de novo em erro e depois lança", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      fetchJson("http://x", { retries: 2, delayMs: 0 }, fakeFetch as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
    expect(fakeFetch).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/lib/http.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/lib/http.ts`:
```ts
export interface FetchOpts {
  retries?: number;
  delayMs?: number;
  headers?: Record<string, string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOpts = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const { retries = 3, delayMs = 500, headers = {} } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers: { Accept: "application/json", ...headers } });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs);
    }
  }
  throw lastErr;
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/lib/http.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fetchJson com retry"
```

---

## Task 4: Ingestão Câmara — deputados

API: `https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome` (paginado via `links` rel=next). Detalhe: `/deputados/{id}` traz `nomeCivil`, `ultimoStatus.siglaPartido`, `ultimoStatus.siglaUf`, `ultimoStatus.urlFoto`.

**Files:**
- Create: `src/ingestion/camara/deputados.ts`
- Test: `tests/ingestion/camara/deputados.test.ts`
- Create: `tests/fixtures/camara-deputados.json`

- [ ] **Step 1: Fixture da resposta da API**

Create `tests/fixtures/camara-deputados.json`:
```json
{
  "dados": [
    { "id": 204554, "nome": "Fulano de Tal", "siglaPartido": "XPTO", "siglaUf": "SP", "urlFoto": "http://foto/204554.jpg" }
  ]
}
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/camara/deputados.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseDeputados } from "../../../src/ingestion/camara/deputados";
import fixture from "../../fixtures/camara-deputados.json";

describe("parseDeputados", () => {
  it("normaliza a lista da Câmara", () => {
    const out = parseDeputados(fixture);
    expect(out).toEqual([
      {
        externalId: "204554",
        casa: "CAMARA",
        nome: "Fulano de Tal",
        partido: "XPTO",
        uf: "SP",
        urlFoto: "http://foto/204554.jpg",
      },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/camara/deputados.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar parse + ingest**

Create `src/ingestion/camara/deputados.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface DeputadoNormalizado {
  externalId: string;
  casa: "CAMARA";
  nome: string;
  partido: string | null;
  uf: string | null;
  urlFoto: string | null;
}

interface CamaraDeputado {
  id: number;
  nome: string;
  siglaPartido?: string;
  siglaUf?: string;
  urlFoto?: string;
}

export function parseDeputados(raw: { dados: CamaraDeputado[] }): DeputadoNormalizado[] {
  return raw.dados.map((d) => ({
    externalId: String(d.id),
    casa: "CAMARA" as const,
    nome: d.nome,
    partido: d.siglaPartido ?? null,
    uf: d.siglaUf ?? null,
    urlFoto: d.urlFoto ?? null,
  }));
}

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

export async function ingestDeputados(): Promise<number> {
  const raw = await fetchJson<{ dados: CamaraDeputado[] }>(
    `${BASE}/deputados?ordem=ASC&ordenarPor=nome&itens=100`,
  );
  const deputados = parseDeputados(raw);
  for (const d of deputados) {
    await prisma.parlamentar.upsert({
      where: { casa_externalId: { casa: "CAMARA", externalId: d.externalId } },
      update: { nome: d.nome, partido: d.partido, uf: d.uf, urlFoto: d.urlFoto },
      create: d,
    });
  }
  return deputados.length;
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/camara/deputados.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de deputados da Câmara"
```

---

## Task 5: Ingestão Câmara — despesas (CEAP)

API: `/deputados/{id}/despesas?ano=YYYY&itens=100&pagina=N`. Campos: `ano`, `mes`, `tipoDespesa`, `nomeFornecedor`, `cnpjCpfFornecedor`, `valorLiquido`.

**Files:**
- Create: `src/ingestion/camara/despesas.ts`
- Test: `tests/ingestion/camara/despesas.test.ts`
- Create: `tests/fixtures/camara-despesas.json`

- [ ] **Step 1: Fixture**

Create `tests/fixtures/camara-despesas.json`:
```json
{
  "dados": [
    { "ano": 2025, "mes": 3, "tipoDespesa": "COMBUSTÍVEIS", "nomeFornecedor": "Posto ABC", "cnpjCpfFornecedor": "00.000.000/0001-00", "valorLiquido": 1500.5 }
  ]
}
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/camara/despesas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseDespesas } from "../../../src/ingestion/camara/despesas";
import fixture from "../../fixtures/camara-despesas.json";

describe("parseDespesas", () => {
  it("normaliza despesas da cota", () => {
    const out = parseDespesas(fixture);
    expect(out).toEqual([
      {
        ano: 2025,
        mes: 3,
        tipo: "COMBUSTÍVEIS",
        fornecedorNome: "Posto ABC",
        fornecedorDoc: "00.000.000/0001-00",
        valor: 1500.5,
      },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/camara/despesas.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/ingestion/camara/despesas.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface DespesaNormalizada {
  ano: number;
  mes: number;
  tipo: string;
  fornecedorNome: string;
  fornecedorDoc: string | null;
  valor: number;
}

interface CamaraDespesa {
  ano: number;
  mes: number;
  tipoDespesa: string;
  nomeFornecedor: string;
  cnpjCpfFornecedor?: string;
  valorLiquido: number;
}

export function parseDespesas(raw: { dados: CamaraDespesa[] }): DespesaNormalizada[] {
  return raw.dados.map((d) => ({
    ano: d.ano,
    mes: d.mes,
    tipo: d.tipoDespesa,
    fornecedorNome: d.nomeFornecedor,
    fornecedorDoc: d.cnpjCpfFornecedor ?? null,
    valor: d.valorLiquido,
  }));
}

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

export async function ingestDespesas(parlamentarId: string, externalId: string, ano: number) {
  const raw = await fetchJson<{ dados: CamaraDespesa[] }>(
    `${BASE}/deputados/${externalId}/despesas?ano=${ano}&itens=100`,
  );
  const despesas = parseDespesas(raw);
  await prisma.despesa.deleteMany({ where: { parlamentarId, ano } });
  await prisma.despesa.createMany({
    data: despesas.map((d) => ({ ...d, parlamentarId })),
  });
  return despesas.length;
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/camara/despesas.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de despesas (CEAP) da Câmara"
```

---

## Task 6: Ingestão Câmara — votações e presença

API: `/votacoes?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD&itens=100` lista votações; `/votacoes/{id}/votos` traz `{ tipoVoto, deputado_: { id } }`. Quem não aparece na lista de votos e estava em exercício = ausente (aproximação do MVP: registramos só os votos presentes; ausência é derivada na análise pela contagem de votações vs votos do parlamentar).

**Files:**
- Create: `src/ingestion/camara/votacoes.ts`
- Test: `tests/ingestion/camara/votacoes.test.ts`
- Create: `tests/fixtures/camara-votos.json`

- [ ] **Step 1: Fixture dos votos de uma votação**

Create `tests/fixtures/camara-votos.json`:
```json
{
  "dados": [
    { "tipoVoto": "Sim", "deputado_": { "id": 204554 } },
    { "tipoVoto": "Não", "deputado_": { "id": 999 } },
    { "tipoVoto": "Obstrução", "deputado_": { "id": 111 } },
    { "tipoVoto": "Abstenção", "deputado_": { "id": 222 } }
  ]
}
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/camara/votacoes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseVotos } from "../../../src/ingestion/camara/votacoes";
import fixture from "../../fixtures/camara-votos.json";

describe("parseVotos", () => {
  it("normaliza tipos de voto", () => {
    const out = parseVotos(fixture);
    expect(out).toEqual([
      { externalIdDeputado: "204554", voto: "SIM" },
      { externalIdDeputado: "999", voto: "NAO" },
      { externalIdDeputado: "111", voto: "OBSTRUCAO" },
      { externalIdDeputado: "222", voto: "ABSTENCAO" },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/camara/votacoes.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/ingestion/camara/votacoes.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export type VotoTipo = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO";

export interface VotoNormalizado {
  externalIdDeputado: string;
  voto: VotoTipo;
}

interface CamaraVoto {
  tipoVoto: string;
  deputado_: { id: number };
}

const MAP: Record<string, VotoTipo> = {
  Sim: "SIM",
  Não: "NAO",
  Nao: "NAO",
  Abstenção: "ABSTENCAO",
  Obstrução: "OBSTRUCAO",
};

export function parseVotos(raw: { dados: CamaraVoto[] }): VotoNormalizado[] {
  return raw.dados
    .filter((v) => MAP[v.tipoVoto])
    .map((v) => ({ externalIdDeputado: String(v.deputado_.id), voto: MAP[v.tipoVoto] }));
}

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

interface CamaraVotacao {
  id: string;
  data: string;
  descricao: string;
}

export async function ingestVotacoes(dataInicio: string, dataFim: string) {
  const lista = await fetchJson<{ dados: CamaraVotacao[] }>(
    `${BASE}/votacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=100&ordem=DESC&ordenarPor=data`,
  );
  for (const v of lista.dados) {
    const votacao = await prisma.votacao.upsert({
      where: { externalId: v.id },
      update: { descricao: v.descricao },
      create: { externalId: v.id, data: new Date(v.data), descricao: v.descricao },
    });
    const votosRaw = await fetchJson<{ dados: CamaraVoto[] }>(`${BASE}/votacoes/${v.id}/votos`);
    const votos = parseVotos(votosRaw);
    for (const voto of votos) {
      const parlamentar = await prisma.parlamentar.findUnique({
        where: { casa_externalId: { casa: "CAMARA", externalId: voto.externalIdDeputado } },
      });
      if (!parlamentar) continue;
      await prisma.votoRegistro.upsert({
        where: { votacaoId_parlamentarId: { votacaoId: votacao.id, parlamentarId: parlamentar.id } },
        update: { voto: voto.voto },
        create: { votacaoId: votacao.id, parlamentarId: parlamentar.id, voto: voto.voto },
      });
    }
  }
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/camara/votacoes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de votações/votos da Câmara"
```

---

## Task 7: Ingestão Câmara — proposições (produção legislativa)

API: `/proposicoes?idDeputadoAutor={id}&itens=100`. Campo `id`, `siglaTipo`, `ano`, `ementa`. "Virou lei" no MVP = tipo indica norma sancionada; como a API de autoria não traz status confiável, marcamos `virouLei=false` por padrão e apenas contamos proposições. (A detecção fina de "virou lei" fica para fatia futura.)

**Files:**
- Create: `src/ingestion/camara/proposicoes.ts`
- Test: `tests/ingestion/camara/proposicoes.test.ts`
- Create: `tests/fixtures/camara-proposicoes.json`

- [ ] **Step 1: Fixture**

Create `tests/fixtures/camara-proposicoes.json`:
```json
{ "dados": [ { "id": 1000, "siglaTipo": "PL", "ano": 2024, "ementa": "Dispõe sobre X." } ] }
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/camara/proposicoes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseProposicoes } from "../../../src/ingestion/camara/proposicoes";
import fixture from "../../fixtures/camara-proposicoes.json";

describe("parseProposicoes", () => {
  it("normaliza proposições", () => {
    const out = parseProposicoes(fixture);
    expect(out).toEqual([
      { externalId: "1000", tipo: "PL", ano: 2024, ementa: "Dispõe sobre X.", virouLei: false },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/camara/proposicoes.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/ingestion/camara/proposicoes.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface ProposicaoNormalizada {
  externalId: string;
  tipo: string;
  ano: number;
  ementa: string;
  virouLei: boolean;
}

interface CamaraProposicao {
  id: number;
  siglaTipo: string;
  ano: number;
  ementa: string;
}

export function parseProposicoes(raw: { dados: CamaraProposicao[] }): ProposicaoNormalizada[] {
  return raw.dados.map((p) => ({
    externalId: String(p.id),
    tipo: p.siglaTipo,
    ano: p.ano,
    ementa: p.ementa,
    virouLei: false,
  }));
}

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

export async function ingestProposicoes(parlamentarId: string, externalId: string) {
  const raw = await fetchJson<{ dados: CamaraProposicao[] }>(
    `${BASE}/proposicoes?idDeputadoAutor=${externalId}&itens=100`,
  );
  const props = parseProposicoes(raw);
  for (const p of props) {
    await prisma.proposicao.upsert({
      where: { externalId: p.externalId },
      update: { ementa: p.ementa },
      create: { ...p, parlamentarId },
    });
  }
  return props.length;
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/camara/proposicoes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de proposições da Câmara"
```

---

## Task 8: Ingestão Senado — senadores

API: `https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json` → `ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]`, cada um com `IdentificacaoParlamentar` (`CodigoParlamentar`, `NomeParlamentar`, `SiglaPartidoParlamentar`, `UfParlamentar`, `UrlFotoParlamentar`).

**Files:**
- Create: `src/ingestion/senado/senadores.ts`
- Test: `tests/ingestion/senado/senadores.test.ts`
- Create: `tests/fixtures/senado-senadores.json`

- [ ] **Step 1: Fixture**

Create `tests/fixtures/senado-senadores.json`:
```json
{
  "ListaParlamentarEmExercicio": {
    "Parlamentares": {
      "Parlamentar": [
        {
          "IdentificacaoParlamentar": {
            "CodigoParlamentar": "5000",
            "NomeParlamentar": "Beltrana",
            "SiglaPartidoParlamentar": "ABC",
            "UfParlamentar": "BA",
            "UrlFotoParlamentar": "http://foto/5000.jpg"
          }
        }
      ]
    }
  }
}
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/senado/senadores.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseSenadores } from "../../../src/ingestion/senado/senadores";
import fixture from "../../fixtures/senado-senadores.json";

describe("parseSenadores", () => {
  it("normaliza a lista do Senado", () => {
    const out = parseSenadores(fixture);
    expect(out).toEqual([
      {
        externalId: "5000",
        casa: "SENADO",
        nome: "Beltrana",
        partido: "ABC",
        uf: "BA",
        urlFoto: "http://foto/5000.jpg",
      },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/senado/senadores.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/ingestion/senado/senadores.ts`:
```ts
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
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/senado/senadores.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de senadores"
```

---

## Task 9: Ingestão Portal da Transparência — emendas

API: `https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=YYYY&nomeAutor=...&pagina=N`, header `chave-api-dados: <KEY>`. Campos usados: `ano`, `funcao`, `localidadeDoGasto` (município/uf), `valorEmpenhado`, `valorPago`. A associação ao parlamentar é por nome do autor (aproximação do MVP; refino por código fica para Fatia 2).

**Files:**
- Create: `src/ingestion/transparencia/emendas.ts`
- Test: `tests/ingestion/transparencia/emendas.test.ts`
- Create: `tests/fixtures/transparencia-emendas.json`

- [ ] **Step 1: Fixture**

Create `tests/fixtures/transparencia-emendas.json`:
```json
[
  { "ano": 2024, "funcao": "Saúde", "localidadeDoGasto": "Salvador - BA", "valorEmpenhado": "100000.00", "valorPago": "50000.00" }
]
```

- [ ] **Step 2: Teste do parse (falha)**

Create `tests/ingestion/transparencia/emendas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseEmendas } from "../../../src/ingestion/transparencia/emendas";
import fixture from "../../fixtures/transparencia-emendas.json";

describe("parseEmendas", () => {
  it("normaliza emendas e separa município/uf", () => {
    const out = parseEmendas(fixture);
    expect(out).toEqual([
      {
        ano: 2024,
        funcao: "Saúde",
        municipioBeneficiario: "Salvador",
        uf: "BA",
        valorEmpenhado: 100000,
        valorPago: 50000,
      },
    ]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/transparencia/emendas.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/ingestion/transparencia/emendas.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface EmendaNormalizada {
  ano: number;
  funcao: string | null;
  municipioBeneficiario: string | null;
  uf: string | null;
  valorEmpenhado: number;
  valorPago: number;
}

interface TransparenciaEmenda {
  ano: number;
  funcao?: string;
  localidadeDoGasto?: string;
  valorEmpenhado?: string;
  valorPago?: string;
}

function splitLocalidade(loc?: string): { municipio: string | null; uf: string | null } {
  if (!loc) return { municipio: null, uf: null };
  const [municipio, uf] = loc.split(" - ").map((s) => s.trim());
  return { municipio: municipio ?? null, uf: uf ?? null };
}

export function parseEmendas(raw: TransparenciaEmenda[]): EmendaNormalizada[] {
  return raw.map((e) => {
    const { municipio, uf } = splitLocalidade(e.localidadeDoGasto);
    return {
      ano: e.ano,
      funcao: e.funcao ?? null,
      municipioBeneficiario: municipio,
      uf,
      valorEmpenhado: Number(e.valorEmpenhado ?? 0),
      valorPago: Number(e.valorPago ?? 0),
    };
  });
}

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

export async function ingestEmendas(parlamentarId: string, nomeAutor: string, ano: number) {
  const key = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!key) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não configurada");
  const raw = await fetchJson<TransparenciaEmenda[]>(
    `${BASE}/emendas?ano=${ano}&nomeAutor=${encodeURIComponent(nomeAutor)}&pagina=1`,
    { headers: { "chave-api-dados": key } },
  );
  const emendas = parseEmendas(raw);
  await prisma.emenda.deleteMany({ where: { parlamentarId, ano } });
  await prisma.emenda.createMany({ data: emendas.map((e) => ({ ...e, parlamentarId })) });
  return emendas.length;
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/transparencia/emendas.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de emendas do Portal da Transparência"
```

---

## Task 10: Tipos de análise + red flag de presença

**Files:**
- Create: `src/analysis/types.ts`, `src/analysis/presenca.ts`
- Test: `tests/analysis/presenca.test.ts`

- [ ] **Step 1: Definir tipos**

Create `src/analysis/types.ts`:
```ts
export type Nivel = "ok" | "atencao" | "alerta" | "sem_dado";

export interface RedFlag {
  id: string;
  titulo: string;
  nivel: Nivel;
  fraseSimples: string;
  fonte: string;
}
```

- [ ] **Step 2: Teste do red flag de presença (falha)**

Create `tests/analysis/presenca.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { redFlagPresenca } from "../../src/analysis/presenca";

describe("redFlagPresenca", () => {
  it("alerta quando falta muito acima da média", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 60, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("4 de cada 10");
  });

  it("ok quando presença está boa", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 95, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há votações", () => {
    const rf = redFlagPresenca({ totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("sem_dado");
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/analysis/presenca.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar**

Create `src/analysis/presenca.ts`:
```ts
import type { RedFlag } from "./types";

export interface PresencaInput {
  totalVotacoes: number;
  presencas: number;
  mediaPresencaPares: number; // 0..1
}

export function redFlagPresenca(i: PresencaInput): RedFlag {
  const base = {
    id: "presenca",
    titulo: "Presença nas votações",
    fonte: "Câmara/Senado — Dados Abertos",
  };
  if (i.totalVotacoes === 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Ainda não há votações registradas no período." };
  }
  const taxa = i.presencas / i.totalVotacoes;
  const faltasEmDez = Math.round((1 - taxa) * 10);
  const frase = `Faltou em ${faltasEmDez} de cada 10 votações.`;
  let nivel: RedFlag["nivel"] = "ok";
  if (taxa < i.mediaPresencaPares - 0.15) nivel = "alerta";
  else if (taxa < i.mediaPresencaPares - 0.05) nivel = "atencao";
  const comparacao =
    nivel === "ok" ? " Está entre os que mais comparecem." : " Isso é mais faltas que a maioria dos colegas.";
  return { ...base, nivel, fraseSimples: frase + comparacao };
}
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/analysis/presenca.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: red flag de presença"
```

---

## Task 11: Red flag de gasto da cota (CEAP)

Sinais: total anual e concentração em poucos fornecedores (Herfindahl simplificado: % do maior fornecedor).

**Files:**
- Create: `src/analysis/despesas.ts`
- Test: `tests/analysis/despesas.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/analysis/despesas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { redFlagDespesas } from "../../src/analysis/despesas";

describe("redFlagDespesas", () => {
  it("alerta quando um fornecedor concentra a maior parte do gasto", () => {
    const rf = redFlagDespesas({
      totalGasto: 10000,
      mediaGastoPares: 9000,
      porFornecedor: [{ nome: "X", valor: 8000 }, { nome: "Y", valor: 2000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("80%");
  });

  it("ok quando gasto distribuído e dentro da média", () => {
    const rf = redFlagDespesas({
      totalGasto: 5000,
      mediaGastoPares: 9000,
      porFornecedor: [{ nome: "X", valor: 2500 }, { nome: "Y", valor: 2500 }],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há gasto", () => {
    const rf = redFlagDespesas({ totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/despesas.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

Create `src/analysis/despesas.ts`:
```ts
import type { RedFlag } from "./types";

export interface DespesasInput {
  totalGasto: number;
  mediaGastoPares: number;
  porFornecedor: Array<{ nome: string; valor: number }>;
}

export function redFlagDespesas(i: DespesasInput): RedFlag {
  const base = {
    id: "despesas",
    titulo: "Uso da cota parlamentar",
    fonte: "Câmara — Cota para Exercício da Atividade Parlamentar (CEAP)",
  };
  if (i.totalGasto <= 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem gastos de cota registrados no período." };
  }
  const maior = i.porFornecedor.reduce((m, f) => (f.valor > m.valor ? f : m), { nome: "", valor: 0 });
  const concentracao = maior.valor / i.totalGasto;
  const pct = Math.round(concentracao * 100);
  const acimaMedia = i.totalGasto > i.mediaGastoPares * 1.2;
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7 || acimaMedia) nivel = "alerta";
  else if (concentracao >= 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Gastos distribuídos e dentro da média dos colegas."
      : `${pct}% do gasto foi para um único fornecedor (${maior.nome}).` +
        (acimaMedia ? " O total também está acima da média." : "");
  return { ...base, nivel, fraseSimples: frase };
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/analysis/despesas.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: red flag de despesas (CEAP)"
```

---

## Task 12: Red flag de emendas concentradas

Sinal: % do valor de emendas destinado a um único município.

**Files:**
- Create: `src/analysis/emendas.ts`
- Test: `tests/analysis/emendas.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/analysis/emendas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { redFlagEmendas } from "../../src/analysis/emendas";

describe("redFlagEmendas", () => {
  it("alerta quando emendas concentradas em um município", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porMunicipio: [{ municipio: "Salvador", valor: 900000 }, { municipio: "Feira", valor: 100000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("Salvador");
    expect(rf.fraseSimples).toContain("90%");
  });

  it("ok quando distribuído", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porMunicipio: [{ municipio: "A", valor: 300000 }, { municipio: "B", valor: 350000 }, { municipio: "C", valor: 350000 }],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há emendas", () => {
    const rf = redFlagEmendas({ total: 0, porMunicipio: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/emendas.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

Create `src/analysis/emendas.ts`:
```ts
import type { RedFlag } from "./types";

export interface EmendasInput {
  total: number;
  porMunicipio: Array<{ municipio: string; valor: number }>;
}

export function redFlagEmendas(i: EmendasInput): RedFlag {
  const base = {
    id: "emendas",
    titulo: "Destino das emendas",
    fonte: "Portal da Transparência — Emendas Parlamentares",
  };
  if (i.total <= 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem emendas registradas no período." };
  }
  const maior = i.porMunicipio.reduce(
    (m, x) => (x.valor > m.valor ? x : m),
    { municipio: "", valor: 0 },
  );
  const concentracao = maior.valor / i.total;
  const pct = Math.round(concentracao * 100);
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7) nivel = "alerta";
  else if (concentracao >= 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Emendas espalhadas por vários municípios."
      : `${pct}% das emendas foram para um só município (${maior.municipio}). Vale entender o porquê.`;
  return { ...base, nivel, fraseSimples: frase };
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/analysis/emendas.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: red flag de emendas concentradas"
```

---

## Task 13: Red flag de produção legislativa

Sinal: quantidade de proposições de autoria (baixa produção = atenção). No MVP comparamos com a média dos pares.

**Files:**
- Create: `src/analysis/legislativa.ts`
- Test: `tests/analysis/legislativa.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/analysis/legislativa.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { redFlagLegislativa } from "../../src/analysis/legislativa";

describe("redFlagLegislativa", () => {
  it("atenção quando produz bem abaixo da média", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 1, mediaProposicoesPares: 20 });
    expect(rf.nivel).toBe("atencao");
    expect(rf.fraseSimples).toContain("1");
  });

  it("ok quando produz na média ou acima", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 25, mediaProposicoesPares: 20 });
    expect(rf.nivel).toBe("ok");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/legislativa.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

Create `src/analysis/legislativa.ts`:
```ts
import type { RedFlag } from "./types";

export interface LegislativaInput {
  totalProposicoes: number;
  mediaProposicoesPares: number;
}

export function redFlagLegislativa(i: LegislativaInput): RedFlag {
  const base = {
    id: "legislativa",
    titulo: "Produção legislativa",
    fonte: "Câmara — Proposições de autoria",
  };
  const nivel: RedFlag["nivel"] =
    i.totalProposicoes < i.mediaProposicoesPares * 0.25 ? "atencao" : "ok";
  const frase =
    nivel === "ok"
      ? `Apresentou ${i.totalProposicoes} projetos — em linha com os colegas.`
      : `Apresentou só ${i.totalProposicoes} projetos, bem menos que a média dos colegas.`;
  return { ...base, nivel, fraseSimples: frase };
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/analysis/legislativa.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: red flag de produção legislativa"
```

---

## Task 14: Agregação da "ficha" do parlamentar

Junta os red flags numa ficha, calculando um resumo (`nivelGeral`) sem "nota" numérica.

**Files:**
- Create: `src/analysis/ficha.ts`
- Test: `tests/analysis/ficha.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/analysis/ficha.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { montarFicha } from "../../src/analysis/ficha";

describe("montarFicha", () => {
  it("nivelGeral é 'alerta' se houver ao menos um red flag em alerta", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 60, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porMunicipio: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("alerta");
    expect(ficha.redFlags).toHaveLength(4);
  });

  it("nivelGeral é 'ok' quando tudo ok/sem_dado", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 95, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porMunicipio: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("ok");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/ficha.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

Create `src/analysis/ficha.ts`:
```ts
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
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/analysis/ficha.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: agregação da ficha do parlamentar"
```

---

## Task 15: Camada de acesso a dados para o front

Funções que leem o Postgres e produzem os inputs da ficha + dados do perfil. Testadas contra o banco (integração leve).

**Files:**
- Create: `src/data/parlamentares.ts`
- Test: `tests/data/parlamentares.test.ts`

- [ ] **Step 1: Teste de integração (falha)**

Create `tests/data/parlamentares.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { listarParlamentares, obterPerfil } from "../../src/data/parlamentares";

let id: string;

beforeAll(async () => {
  const p = await prisma.parlamentar.create({
    data: { casa: "CAMARA", externalId: "test-1", nome: "Teste Silva", partido: "ZZZ", uf: "SP" },
  });
  id = p.id;
});

afterAll(async () => {
  await prisma.parlamentar.delete({ where: { id } });
});

describe("data access", () => {
  it("lista parlamentares com busca por nome", async () => {
    const lista = await listarParlamentares("Teste");
    expect(lista.some((p) => p.id === id)).toBe(true);
  });

  it("obtém perfil com ficha", async () => {
    const perfil = await obterPerfil(id);
    expect(perfil?.nome).toBe("Teste Silva");
    expect(perfil?.ficha.redFlags).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/data/parlamentares.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/data/parlamentares.ts`:
```ts
import { prisma } from "../db/client";
import { montarFicha, type Ficha } from "../analysis/ficha";

export interface ParlamentarResumo {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: string;
  urlFoto: string | null;
}

export async function listarParlamentares(busca?: string): Promise<ParlamentarResumo[]> {
  return prisma.parlamentar.findMany({
    where: busca ? { nome: { contains: busca, mode: "insensitive" } } : undefined,
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, partido: true, uf: true, casa: true, urlFoto: true },
    take: 100,
  });
}

export interface Perfil extends ParlamentarResumo {
  ficha: Ficha;
}

const ANO = 2025;

export async function obterPerfil(id: string): Promise<Perfil | null> {
  const p = await prisma.parlamentar.findUnique({ where: { id } });
  if (!p) return null;

  const totalVotacoes = await prisma.votacao.count();
  const presencas = await prisma.votoRegistro.count({ where: { parlamentarId: id } });

  const despesas = await prisma.despesa.findMany({ where: { parlamentarId: id, ano: ANO } });
  const totalGasto = despesas.reduce((s, d) => s + d.valor, 0);
  const porFornecedorMap = new Map<string, number>();
  for (const d of despesas) porFornecedorMap.set(d.fornecedorNome, (porFornecedorMap.get(d.fornecedorNome) ?? 0) + d.valor);
  const porFornecedor = [...porFornecedorMap].map(([nome, valor]) => ({ nome, valor }));

  const emendas = await prisma.emenda.findMany({ where: { parlamentarId: id } });
  const totalEmendas = emendas.reduce((s, e) => s + e.valorEmpenhado, 0);
  const porMunicipioMap = new Map<string, number>();
  for (const e of emendas)
    if (e.municipioBeneficiario)
      porMunicipioMap.set(e.municipioBeneficiario, (porMunicipioMap.get(e.municipioBeneficiario) ?? 0) + e.valorEmpenhado);
  const porMunicipio = [...porMunicipioMap].map(([municipio, valor]) => ({ municipio, valor }));

  const totalProposicoes = await prisma.proposicao.count({ where: { parlamentarId: id } });

  const ficha = montarFicha({
    presenca: { totalVotacoes, presencas, mediaPresencaPares: 0.9 },
    despesas: { totalGasto, mediaGastoPares: 300000, porFornecedor },
    emendas: { total: totalEmendas, porMunicipio },
    legislativa: { totalProposicoes, mediaProposicoesPares: 20 },
  });

  return {
    id: p.id, nome: p.nome, partido: p.partido, uf: p.uf, casa: p.casa, urlFoto: p.urlFoto, ficha,
  };
}
```

> Nota: as médias dos pares estão fixas como constantes de partida (0.9 presença, R$300k gasto, 20 proposições). Calcular as médias reais a partir do banco é melhoria da Fatia 2.

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/data/parlamentares.test.ts` (com Postgres ativo)
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: camada de acesso a dados para o front"
```

---

## Task 16: Página de busca/lista

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/globals.css` (se não existir do scaffold, senão editar)
- Test: `tests/app/page.test.tsx` (render de Server Component via chamada direta)

- [ ] **Step 1: Teste de renderização (falha)**

Create `tests/app/page.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/data/parlamentares", () => ({
  listarParlamentares: vi.fn().mockResolvedValue([
    { id: "1", nome: "Fulano", partido: "XPTO", uf: "SP", casa: "CAMARA", urlFoto: null },
  ]),
}));

import Page from "../../src/app/page";

describe("Home", () => {
  it("renderiza a lista de parlamentares", async () => {
    const el = await Page({ searchParams: Promise.resolve({}) });
    const json = JSON.stringify(el);
    expect(json).toContain("Fulano");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/app/page.test.tsx`
Expected: FAIL — `page.tsx` ainda não exporta o componente esperado / não chama `listarParlamentares`.

- [ ] **Step 3: Implementar a página**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link";
import { listarParlamentares } from "../data/parlamentares";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const lista = await listarParlamentares(q);
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Radar do Congresso</h1>
      <p>Veja como seus deputados e senadores atuam — em linguagem simples.</p>
      <form>
        <input name="q" defaultValue={q ?? ""} placeholder="Buscar por nome..." style={{ padding: 8, width: "100%" }} />
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {lista.map((p) => (
          <li key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
            <Link href={`/parlamentar/${p.id}`}>
              <strong>{p.nome}</strong> — {p.partido}/{p.uf} ({p.casa})
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/app/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: página de busca/lista"
```

---

## Task 17: Página de perfil com red flags + fontes + presunção de inocência

**Files:**
- Create: `src/app/parlamentar/[id]/page.tsx`
- Create: `src/app/parlamentar/[id]/RedFlagCard.tsx`
- Test: `tests/app/perfil.test.tsx`

- [ ] **Step 1: Teste (falha)**

Create `tests/app/perfil.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/app/perfil.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar card + página**

Create `src/app/parlamentar/[id]/RedFlagCard.tsx`:
```tsx
import type { RedFlag } from "../../../analysis/types";

const CORES: Record<RedFlag["nivel"], string> = {
  ok: "#1a7f37",
  atencao: "#b58900",
  alerta: "#b00020",
  sem_dado: "#666",
};

const ROTULO: Record<RedFlag["nivel"], string> = {
  ok: "Tudo certo",
  atencao: "Atenção",
  alerta: "Sinal de alerta",
  sem_dado: "Sem dados",
};

export function RedFlagCard({ rf }: { rf: RedFlag }) {
  return (
    <div style={{ border: `1px solid ${CORES[rf.nivel]}`, borderRadius: 8, padding: 16, margin: "12px 0" }}>
      <div style={{ color: CORES[rf.nivel], fontWeight: 700 }}>
        {ROTULO[rf.nivel]} · {rf.titulo}
      </div>
      <p>{rf.fraseSimples}</p>
      <small style={{ color: "#666" }}>Fonte: {rf.fonte}</small>
    </div>
  );
}
```

Create `src/app/parlamentar/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { obterPerfil } from "../../../data/parlamentares";
import { RedFlagCard } from "./RedFlagCard";

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <a href="/">← voltar</a>
      <h1>{perfil.nome}</h1>
      <p>{perfil.partido}/{perfil.uf} — {perfil.casa}</p>
      <h2>Ficha do parlamentar</h2>
      {perfil.ficha.redFlags.map((rf) => (
        <RedFlagCard key={rf.id} rf={rf} />
      ))}
      <p style={{ marginTop: 24, fontSize: 13, color: "#666", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        Estes são <strong>sinais para você investigar</strong>, com base em dados públicos oficiais — não são
        acusações. Vale sempre a <strong>presunção de inocência</strong>: um sinal de alerta indica um padrão que
        merece atenção, não a comprovação de irregularidade.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/app/perfil.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar no navegador**

Run: `npm run dev` e abra `http://localhost:3000`. Confirme busca e um perfil (após rodar a ingestão da Task 18).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: página de perfil com red flags e aviso ético"
```

---

## Task 18: Orquestrador de ingestão + script npm

**Files:**
- Create: `src/ingestion/run-all.ts`
- Modify: `package.json` (script `ingest`)
- Modify: `tsconfig.json` (garantir `ts-node`/execução) — usar `tsx`
- Test: `tests/ingestion/run-all.test.ts`

- [ ] **Step 1: Instalar runner**

Run: `npm install -D tsx`

- [ ] **Step 2: Teste do orquestrador (falha)**

Create `tests/ingestion/run-all.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ordemDeIngestao } from "../../src/ingestion/run-all";

describe("run-all", () => {
  it("ingere identidades antes de dados dependentes", () => {
    const ordem = ordemDeIngestao();
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("despesas"));
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("votacoes"));
    expect(ordem.indexOf("senadores")).toBeLessThan(ordem.indexOf("emendas"));
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test tests/ingestion/run-all.test.ts`
Expected: FAIL

- [ ] **Step 4: Implementar orquestrador**

Create `src/ingestion/run-all.ts`:
```ts
import { prisma } from "../db/client";
import { ingestDeputados } from "./camara/deputados";
import { ingestDespesas } from "./camara/despesas";
import { ingestVotacoes } from "./camara/votacoes";
import { ingestProposicoes } from "./camara/proposicoes";
import { ingestSenadores } from "./senado/senadores";
import { ingestEmendas } from "./transparencia/emendas";

export function ordemDeIngestao(): string[] {
  return ["deputados", "senadores", "despesas", "proposicoes", "votacoes", "emendas"];
}

const ANO = 2025;

async function main() {
  console.log("Ingerindo deputados...");
  await ingestDeputados();
  console.log("Ingerindo senadores...");
  await ingestSenadores();

  const camara = await prisma.parlamentar.findMany({ where: { casa: "CAMARA" } });
  for (const dep of camara) {
    await ingestDespesas(dep.id, dep.externalId, ANO);
    await ingestProposicoes(dep.id, dep.externalId);
  }

  console.log("Ingerindo votações...");
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fim = hoje.toISOString().slice(0, 10);
  await ingestVotacoes(inicio, fim);

  if (process.env.PORTAL_TRANSPARENCIA_API_KEY) {
    console.log("Ingerindo emendas...");
    const todos = await prisma.parlamentar.findMany();
    for (const p of todos) await ingestEmendas(p.id, p.nome, ANO).catch(() => 0);
  } else {
    console.log("Pulei emendas (sem PORTAL_TRANSPARENCIA_API_KEY).");
  }

  console.log("Concluído.");
}

if (process.argv[1]?.includes("run-all")) {
  main().finally(() => prisma.$disconnect());
}
```

Add script em `package.json`:
```json
"ingest": "tsx src/ingestion/run-all.ts"
```

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/run-all.test.ts`
Expected: PASS

- [ ] **Step 6: Ingestão real (smoke manual)**

Run: `npm run ingest`
Expected: popula o banco (deputados/senadores/despesas/proposições/votações; emendas se houver chave). Pode levar alguns minutos.

- [ ] **Step 7: Rodar toda a suíte**

Run: `npm test`
Expected: todos os testes PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: orquestrador de ingestão + script npm"
```

---

## Encerramento

- [ ] **Rodar suíte completa:** `npm test` → tudo verde.
- [ ] **Subir app:** `npm run dev`, validar busca + perfil de um parlamentar real.
- [ ] **Atualizar README** com: `docker compose up -d`, `npx prisma migrate dev`, `npm run ingest`, `npm run dev`, e onde obter a `PORTAL_TRANSPARENCIA_API_KEY`.
- [ ] **Commit final** do README.

## Notas para fatias futuras (fora deste plano)
- Médias reais dos pares calculadas do banco (hoje são constantes).
- "Virou lei" com status real das proposições.
- Ingestão de processos/condenações (Ficha Limpa/TSE).
- Fatia 2: cruzamento emendas × CNPJ × doadores de campanha × parentesco.
- Personalização "meus políticos" + alertas.
- Agendamento automático da ingestão (cron).
