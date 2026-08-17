# Motor de Cruzamento Investigativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revelar possíveis vínculos entre doadores de campanha (CPF) e beneficiários de emendas (empresas e seus sócios), exibidos como "possível vínculo a investigar" com rastro e fontes.

**Architecture:** Novas ingestões (TSE doações, favorecidos de emenda via Portal, sócios via BrasilAPI sob demanda) → Postgres → função pura `detectarConexoes` faz o matching probabilístico (nome normalizado + dígitos visíveis do CPF) → seção "Investigação" no perfil (Server Component) com selos de confiança e aviso explícito da natureza probabilística.

**Tech Stack:** Next.js 16 + TypeScript, Postgres + Prisma 7, Vitest. Fontes: TSE (CSV dados abertos), Portal da Transparência (API), BrasilAPI (CNPJ/QSA).

---

## File Structure

```
prisma/schema.prisma                         # + Doacao, Favorecido, Socio, Conexao
src/lib/texto.ts                             # normalizaNome, soDigitos (compartilhado)
src/analysis/conexoes.ts                     # detectarConexoes (PURA) — o coração
src/ingestion/tse/doacoes.ts                 # parseLinhaDoacao + ingestDoacoes (CSV)
src/ingestion/transparencia/favorecidos.ts   # parseFavorecidos + ingestFavorecidos
src/ingestion/receita/socios.ts              # parseSocios + enrichSocios (BrasilAPI + cache)
src/data/investigacao.ts                     # monta inputs do banco + detectarConexoes
src/analysis/emendas.ts                      # (modificar) concentração por beneficiário
src/data/parlamentares.ts                    # (modificar) passar beneficiários ao flag
src/components/InvestigacaoSecao.tsx         # UI da seção + aviso probabilístico
src/components/ConexaoCard.tsx               # 1 conexão (rastro + confiança + fontes)
src/app/parlamentar/[id]/page.tsx            # (modificar) render da seção
src/ingestion/run-all.ts                     # (modificar) orquestra as novas etapas
```

**Princípio:** `detectarConexoes` é pura (recebe dados, devolve conexões) — testável sem banco. Cada ingestão separa `parse*` (puro) de `ingest*` (I/O).

---

## Task 1: Utilitário de texto compartilhado

**Files:**
- Create: `src/lib/texto.ts`
- Test: `tests/lib/texto.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/lib/texto.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizaNome, soDigitos } from "../../src/lib/texto";

describe("normalizaNome", () => {
  it("tira acento, maiúsculas, colapsa espaços", () => {
    expect(normalizaNome("  Tábata   Amaral ")).toBe("TABATA AMARAL");
  });
});

describe("soDigitos", () => {
  it("mantém só os dígitos visíveis de um CPF mascarado", () => {
    expect(soDigitos("***.456.789-**")).toBe("456789");
    expect(soDigitos("12.345.678/0001-90")).toBe("12345678000190");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/lib/texto.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/lib/texto.ts`:
```ts
export function normalizaNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function soDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/lib/texto.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Reaproveitar em emendas.ts (DRY)**

In `src/ingestion/transparencia/emendas.ts`, replace the local `normalizaNomeAutor` body to delegate:
```ts
import { normalizaNome } from "../../lib/texto";
export function normalizaNomeAutor(nome: string): string {
  return normalizaNome(nome);
}
```
Run: `npm test` (full) — everything still green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared text normalization util"
```

---

## Task 2: Modelos Prisma (Doacao, Favorecido, Socio, Conexao)

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/db/investigacao-schema.test.ts`

- [ ] **Step 1: Adicionar modelos**

In `prisma/schema.prisma`, add (after the existing `Emenda` model):
```prisma
model Doacao {
  id            String      @id @default(cuid())
  parlamentar   Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId String
  doadorNome    String
  doadorDoc     String
  valor         Float
  ano           Int
  cargo         String?
  @@index([parlamentarId])
}

model Favorecido {
  id            String      @id @default(cuid())
  parlamentar   Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId String
  codigoEmenda  String
  doc           String
  nome          String
  tipoPessoa    String      // "PF" | "PJ"
  valorPago     Float
  ano           Int
  @@index([parlamentarId])
  @@index([doc])
}

model Socio {
  id     String @id @default(cuid())
  cnpj   String
  nome   String
  doc    String
  @@unique([cnpj, doc, nome])
  @@index([cnpj])
}

model Conexao {
  id            String      @id @default(cuid())
  parlamentar   Parlamentar @relation(fields: [parlamentarId], references: [id])
  parlamentarId String
  tipo          String      // "DIRETA" | "SOCIO"
  doadorNome    String
  doadorDoc     String
  empresaCnpj   String?
  empresaNome   String?
  valorDoacao   Float
  valorEmenda   Float
  ano           Int
  confianca     String      // "alta" | "media" | "baixa"
  @@index([parlamentarId])
}
```
Add the back-relations to `model Parlamentar` (in its field list):
```prisma
  doacoes      Doacao[]
  favorecidos  Favorecido[]
  conexoes     Conexao[]
```

- [ ] **Step 2: Migration**

Run: `npx prisma migrate dev --name investigacao`
Expected: cria a migration e regenera o client sem erro.

- [ ] **Step 3: Teste de acesso (falha → passa)**

Create `tests/db/investigacao-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { prisma } from "../../src/db/client";

describe("schema investigação", () => {
  it("expõe as novas tabelas", async () => {
    expect(typeof (await prisma.doacao.count())).toBe("number");
    expect(typeof (await prisma.favorecido.count())).toBe("number");
    expect(typeof (await prisma.socio.count())).toBe("number");
    expect(typeof (await prisma.conexao.count())).toBe("number");
  });
});
```
Run: `npm test tests/db/investigacao-schema.test.ts` (Postgres up) → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: prisma models for investigação (doacao, favorecido, socio, conexao)"
```

---

## Task 3: `detectarConexoes` — motor de matching (PURA, o coração)

**Files:**
- Create: `src/analysis/conexoes.ts`
- Test: `tests/analysis/conexoes.test.ts`

- [ ] **Step 1: Teste (falha)**

Create `tests/analysis/conexoes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { detectarConexoes } from "../../src/analysis/conexoes";

const doador = { nome: "João da Silva", doc: "***.456.789-**", valor: 5000, ano: 2022 };

describe("detectarConexoes", () => {
  it("match DIRETO: doador é o próprio favorecido (PF)", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        { doc: "***.456.789-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 20000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("DIRETA");
    expect(cx[0].confianca).toBe("alta");
    expect(cx[0].valorEmenda).toBe(20000);
  });

  it("match por SÓCIO: doador é sócio da empresa beneficiária", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        {
          doc: "12.345.678/0001-90", nome: "Construtora XPTO", tipoPessoa: "PJ", valorPago: 900000, ano: 2024,
          socios: [{ nome: "João da Silva", doc: "***.456.789-**" }],
        },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].empresaNome).toBe("Construtora XPTO");
    expect(cx[0].confianca).toBe("alta");
  });

  it("rejeita HOMÔNIMO: mesmo nome, dígitos de CPF diferentes", () => {
    const cx = detectarConexoes({
      doadores: [doador], // 456789
      beneficiarios: [
        { doc: "***.111.222-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 1000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(0);
  });

  it("confiança 'media' quando só o nome bate (sem dígitos de CPF)", () => {
    const cx = detectarConexoes({
      doadores: [{ nome: "Maria Souza", doc: "", valor: 3000, ano: 2022 }],
      beneficiarios: [
        { doc: "", nome: "Maria Souza", tipoPessoa: "PF", valorPago: 5000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].confianca).toBe("media");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/conexoes.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/analysis/conexoes.ts`:
```ts
import { normalizaNome, soDigitos } from "../lib/texto";

export type Confianca = "alta" | "media" | "baixa";
export type TipoConexao = "DIRETA" | "SOCIO";

export interface DoadorInput {
  nome: string;
  doc: string;
  valor: number;
  ano: number;
}

export interface BeneficiarioInput {
  doc: string;
  nome: string;
  tipoPessoa: "PF" | "PJ";
  valorPago: number;
  ano: number;
  socios: { nome: string; doc: string }[];
}

export interface ConexoesInput {
  doadores: DoadorInput[];
  beneficiarios: BeneficiarioInput[];
}

export interface Conexao {
  tipo: TipoConexao;
  doadorNome: string;
  doadorDoc: string;
  empresaCnpj: string | null;
  empresaNome: string | null;
  valorDoacao: number;
  valorEmenda: number;
  ano: number;
  confianca: Confianca;
}

// Compara duas pessoas por nome normalizado + dígitos visíveis do CPF.
// Retorna a confiança, ou null se não há correspondência plausível.
function comparaPessoa(
  aNome: string,
  aDoc: string,
  bNome: string,
  bDoc: string,
): Confianca | null {
  const nomeA = normalizaNome(aNome);
  const nomeB = normalizaNome(bNome);
  if (!nomeA || nomeA !== nomeB) return null; // nome completo precisa bater

  const digA = soDigitos(aDoc);
  const digB = soDigitos(bDoc);
  if (digA && digB) {
    // Ambos têm dígitos visíveis: precisam ser compatíveis (um contém o outro).
    const compat = digA === digB || digA.includes(digB) || digB.includes(digA);
    return compat ? "alta" : null; // dígitos divergentes => homônimo, rejeita
  }
  // Só o nome bate (sem dígitos para confirmar) => média.
  return "media";
}

export function detectarConexoes(input: ConexoesInput): Conexao[] {
  const conexoes: Conexao[] = [];
  for (const b of input.beneficiarios) {
    for (const d of input.doadores) {
      // Match direto: o doador é o próprio favorecido.
      const direto = comparaPessoa(d.nome, d.doc, b.nome, b.doc);
      if (direto) {
        conexoes.push({
          tipo: "DIRETA",
          doadorNome: d.nome,
          doadorDoc: d.doc,
          empresaCnpj: b.tipoPessoa === "PJ" ? b.doc : null,
          empresaNome: b.tipoPessoa === "PJ" ? b.nome : null,
          valorDoacao: d.valor,
          valorEmenda: b.valorPago,
          ano: b.ano,
          confianca: direto,
        });
        continue;
      }
      // Match por sócio: o doador é sócio da empresa beneficiária.
      if (b.tipoPessoa === "PJ") {
        for (const s of b.socios) {
          const viaSocio = comparaPessoa(d.nome, d.doc, s.nome, s.doc);
          if (viaSocio) {
            conexoes.push({
              tipo: "SOCIO",
              doadorNome: d.nome,
              doadorDoc: d.doc,
              empresaCnpj: b.doc,
              empresaNome: b.nome,
              valorDoacao: d.valor,
              valorEmenda: b.valorPago,
              ano: b.ano,
              confianca: viaSocio,
            });
            break;
          }
        }
      }
    }
  }
  return conexoes;
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/analysis/conexoes.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: detectarConexoes matching engine (pure)"
```

---

## Task 4: Ingestão TSE — doações de campanha

Fonte: CSV de dados abertos do TSE `receitas_candidatos_<ano>.csv` (separador `;`, encoding latin1,
cabeçalho com colunas `NM_CANDIDATO`, `SG_UF`, `DS_CARGO`, `NM_DOADOR`, `NR_CPF_CNPJ_DOADOR`,
`VR_RECEITA`). O arquivo é grande e baixado à parte para `data/tse/receitas_<ano>.csv` (documente a
URL no README). O parse trabalha sobre UMA linha (objeto já separado por `;`).

**Files:**
- Create: `src/ingestion/tse/doacoes.ts`
- Test: `tests/ingestion/tse/doacoes.test.ts`

- [ ] **Step 1: Teste do parse (falha)**

Create `tests/ingestion/tse/doacoes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseLinhaDoacao } from "../../../src/ingestion/tse/doacoes";

describe("parseLinhaDoacao", () => {
  it("normaliza uma linha de receita do TSE", () => {
    const linha = {
      NM_CANDIDATO: "TABATA CLAUDIA AMARAL DE PONTES",
      SG_UF: "SP",
      DS_CARGO: "DEPUTADO FEDERAL",
      NM_DOADOR: "João da Silva",
      NR_CPF_CNPJ_DOADOR: "***.456.789-**",
      VR_RECEITA: "5.000,00",
      ANO_ELEICAO: "2022",
    };
    expect(parseLinhaDoacao(linha)).toEqual({
      candidatoNome: "TABATA CLAUDIA AMARAL DE PONTES",
      uf: "SP",
      cargo: "DEPUTADO FEDERAL",
      doadorNome: "João da Silva",
      doadorDoc: "***.456.789-**",
      valor: 5000,
      ano: 2022,
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/ingestion/tse/doacoes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar parse + ingest**

Create `src/ingestion/tse/doacoes.ts`:
```ts
import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { normalizaNome } from "../../lib/texto";

export interface DoacaoNormalizada {
  candidatoNome: string;
  uf: string;
  cargo: string;
  doadorNome: string;
  doadorDoc: string;
  valor: number;
  ano: number;
}

interface LinhaTSE {
  NM_CANDIDATO: string;
  SG_UF: string;
  DS_CARGO: string;
  NM_DOADOR: string;
  NR_CPF_CNPJ_DOADOR: string;
  VR_RECEITA: string;
  ANO_ELEICAO: string;
}

function valorBR(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function parseLinhaDoacao(l: LinhaTSE): DoacaoNormalizada {
  return {
    candidatoNome: l.NM_CANDIDATO,
    uf: l.SG_UF,
    cargo: l.DS_CARGO,
    doadorNome: l.NM_DOADOR,
    doadorDoc: l.NR_CPF_CNPJ_DOADOR,
    valor: valorBR(l.VR_RECEITA),
    ano: Number(l.ANO_ELEICAO),
  };
}

// Lê o CSV baixado e grava as doações dos candidatos que casam com parlamentares
// no banco (por nome normalizado + UF). Idempotente por parlamentar+ano.
export async function ingestDoacoes(caminhoCsv: string): Promise<number> {
  const conteudo = await readFile(caminhoCsv, "latin1");
  const linhas = conteudo.split(/\r?\n/).filter(Boolean);
  const header = linhas[0].split(";").map((c) => c.replace(/"/g, "").trim());
  const idx = (c: string) => header.indexOf(c);

  const parlamentares = await prisma.parlamentar.findMany();
  const porChave = new Map<string, string>(); // nomeNorm|uf -> parlamentarId
  for (const p of parlamentares) porChave.set(`${normalizaNome(p.nome)}|${p.uf ?? ""}`, p.id);

  const anos = new Set<string>();
  let total = 0;
  const buffer: { parlamentarId: string; d: DoacaoNormalizada }[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";").map((c) => c.replace(/^"|"$/g, ""));
    const raw: LinhaTSE = {
      NM_CANDIDATO: cols[idx("NM_CANDIDATO")] ?? "",
      SG_UF: cols[idx("SG_UF")] ?? "",
      DS_CARGO: cols[idx("DS_CARGO")] ?? "",
      NM_DOADOR: cols[idx("NM_DOADOR")] ?? "",
      NR_CPF_CNPJ_DOADOR: cols[idx("NR_CPF_CNPJ_DOADOR")] ?? "",
      VR_RECEITA: cols[idx("VR_RECEITA")] ?? "0",
      ANO_ELEICAO: cols[idx("ANO_ELEICAO")] ?? "0",
    };
    const d = parseLinhaDoacao(raw);
    const pid = porChave.get(`${normalizaNome(d.candidatoNome)}|${d.uf}`);
    if (!pid) continue;
    buffer.push({ parlamentarId: pid, d });
    anos.add(String(d.ano));
    total++;
  }

  // Limpa os anos que vamos regravar e insere.
  const pids = [...new Set(buffer.map((b) => b.parlamentarId))];
  await prisma.doacao.deleteMany({
    where: { parlamentarId: { in: pids }, ano: { in: [...anos].map(Number) } },
  });
  await prisma.doacao.createMany({
    data: buffer.map((b) => ({
      parlamentarId: b.parlamentarId,
      doadorNome: b.d.doadorNome,
      doadorDoc: b.d.doadorDoc,
      valor: b.d.valor,
      ano: b.d.ano,
      cargo: b.d.cargo,
    })),
  });
  return total;
}
```

- [ ] **Step 4: Confirmar colunas reais do CSV (verificação)**

Baixe o cabeçalho real e confirme os nomes de coluna usados acima:
Run: `head -1 data/tse/receitas_2022.csv` (após baixar o CSV do portal de dados abertos do TSE).
Se algum nome divergir (ex.: `VR_RECEITA` vs `VR_DOCUMENTO`), ajuste as chaves em `LinhaTSE`/parse
e re-rode o teste do parse com um fixture atualizado. Não prossiga com nomes de coluna não confirmados.

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/tse/doacoes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de doações de campanha (TSE)"
```

---

## Task 5: Ingestão de favorecidos das emendas (Portal)

Enriquece cada emenda já ingerida com o CNPJ/CPF que **recebeu** o dinheiro, via os documentos de
execução do Portal. O parse trabalha sobre o objeto de documento; o ingest confirma o endpoint.

**Files:**
- Create: `src/ingestion/transparencia/favorecidos.ts`
- Test: `tests/ingestion/transparencia/favorecidos.test.ts`
- Create: `tests/fixtures/transparencia-documentos.json`

- [ ] **Step 1: Fixture + teste do parse (falha)**

Create `tests/fixtures/transparencia-documentos.json`:
```json
[
  { "favorecido": { "codigoFormatado": "12.345.678/0001-90", "nome": "CONSTRUTORA XPTO LTDA" }, "valor": "900000.00" },
  { "favorecido": { "codigoFormatado": "00.111.222/0001-33", "nome": "PREFEITURA MUNICIPAL DE EXEMPLO" }, "valor": "50000.00" }
]
```
Create `tests/ingestion/transparencia/favorecidos.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseFavorecidos } from "../../../src/ingestion/transparencia/favorecidos";
import fixture from "../../fixtures/transparencia-documentos.json";

describe("parseFavorecidos", () => {
  it("normaliza favorecidos e classifica PF/PJ, ignorando órgão público", () => {
    const out = parseFavorecidos(fixture, 2024);
    expect(out).toEqual([
      { doc: "12.345.678/0001-90", nome: "CONSTRUTORA XPTO LTDA", tipoPessoa: "PJ", valorPago: 900000, ano: 2024, publico: false },
      { doc: "00.111.222/0001-33", nome: "PREFEITURA MUNICIPAL DE EXEMPLO", tipoPessoa: "PJ", valorPago: 50000, ano: 2024, publico: true },
    ]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/ingestion/transparencia/favorecidos.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/ingestion/transparencia/favorecidos.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";

export interface FavorecidoNormalizado {
  doc: string;
  nome: string;
  tipoPessoa: "PF" | "PJ";
  valorPago: number;
  ano: number;
  publico: boolean;
}

interface DocumentoRaw {
  favorecido?: { codigoFormatado?: string; nome?: string };
  valor?: string;
}

const PALAVRAS_PUBLICAS = ["PREFEITURA", "MUNICIPIO", "MUNICÍPIO", "ESTADO DE", "FUNDO", "SECRETARIA", "GOVERNO"];

export function parseFavorecidos(raw: DocumentoRaw[], ano: number): FavorecidoNormalizado[] {
  return raw.map((d) => {
    const doc = d.favorecido?.codigoFormatado ?? "";
    const nome = d.favorecido?.nome ?? "";
    const tipoPessoa: "PF" | "PJ" = soDigitos(doc).length > 11 ? "PJ" : "PF";
    const publico = PALAVRAS_PUBLICAS.some((p) => nome.toUpperCase().includes(p));
    return { doc, nome, tipoPessoa, valorPago: Number(d.valor ?? 0), ano, publico };
  });
}

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

// Busca os documentos de execução de uma emenda e grava os favorecidos PRIVADOS.
export async function ingestFavorecidos(
  parlamentarId: string,
  codigoEmenda: string,
  ano: number,
): Promise<number> {
  const key = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!key) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não configurada");
  const raw = await fetchJson<DocumentoRaw[]>(
    `${BASE}/emendas/documentos/${encodeURIComponent(codigoEmenda)}?pagina=1`,
    { headers: { "chave-api-dados": key } },
  );
  const favs = parseFavorecidos(raw, ano).filter((f) => !f.publico && f.doc);
  await prisma.favorecido.deleteMany({ where: { parlamentarId, codigoEmenda } });
  await prisma.favorecido.createMany({
    data: favs.map((f) => ({
      parlamentarId, codigoEmenda, doc: f.doc, nome: f.nome, tipoPessoa: f.tipoPessoa,
      valorPago: f.valorPago, ano: f.ano,
    })),
  });
  return favs.length;
}
```

- [ ] **Step 4: Confirmar o endpoint de documentos (verificação)**

O caminho exato dos documentos de execução de uma emenda precisa ser confirmado. Rode (com a chave):
```bash
KEY=$(grep '^PORTAL_TRANSPARENCIA_API_KEY=' .env | sed 's/^[^=]*=//' | tr -d '"')
# pegue um codigoEmenda real via /emendas e teste o endpoint de documentos:
curl -s "https://api.portaldatransparencia.gov.br/api-de-dados/emendas/documentos/<codigo>?pagina=1" -H "chave-api-dados: $KEY" | head -c 400
```
Se o caminho ou o campo do favorecido divergir (ex.: `documentosRelacionados`, `codigo` em vez de
`codigoFormatado`), ajuste `DocumentoRaw`/o URL e o fixture, e re-rode o teste do parse. Não
prossiga com um endpoint não confirmado.

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test tests/ingestion/transparencia/favorecidos.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestão de favorecidos das emendas (Portal)"
```

---

## Task 6: Sócios via BrasilAPI (sob demanda, com cache)

**Files:**
- Create: `src/ingestion/receita/socios.ts`
- Test: `tests/ingestion/receita/socios.test.ts`
- Create: `tests/fixtures/brasilapi-cnpj.json`

- [ ] **Step 1: Fixture + teste do parse (falha)**

Create `tests/fixtures/brasilapi-cnpj.json`:
```json
{
  "cnpj": "12345678000190",
  "razao_social": "CONSTRUTORA XPTO LTDA",
  "qsa": [
    { "nome_socio": "João da Silva", "cnpj_cpf_do_socio": "***.456.789-**" },
    { "nome_socio": "Ana Pereira", "cnpj_cpf_do_socio": "***.222.333-**" }
  ]
}
```
Create `tests/ingestion/receita/socios.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseSocios } from "../../../src/ingestion/receita/socios";
import fixture from "../../fixtures/brasilapi-cnpj.json";

describe("parseSocios", () => {
  it("extrai o quadro societário da resposta da BrasilAPI", () => {
    expect(parseSocios(fixture)).toEqual([
      { cnpj: "12345678000190", nome: "João da Silva", doc: "***.456.789-**" },
      { cnpj: "12345678000190", nome: "Ana Pereira", doc: "***.222.333-**" },
    ]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/ingestion/receita/socios.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/ingestion/receita/socios.ts`:
```ts
import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";

export interface SocioNormalizado {
  cnpj: string;
  nome: string;
  doc: string;
}

interface BrasilApiCnpj {
  cnpj: string;
  razao_social?: string;
  qsa?: { nome_socio: string; cnpj_cpf_do_socio: string }[];
}

export function parseSocios(raw: BrasilApiCnpj): SocioNormalizado[] {
  const cnpj = soDigitos(raw.cnpj);
  return (raw.qsa ?? []).map((s) => ({
    cnpj,
    nome: s.nome_socio,
    doc: s.cnpj_cpf_do_socio,
  }));
}

// Busca o QSA na BrasilAPI (sob demanda) e cacheia. Se já houver sócios em cache
// para o CNPJ, não busca de novo.
export async function enrichSocios(cnpjFormatado: string): Promise<number> {
  const cnpj = soDigitos(cnpjFormatado);
  if (!cnpj) return 0;
  const jaTem = await prisma.socio.count({ where: { cnpj } });
  if (jaTem > 0) return jaTem;

  const raw = await fetchJson<BrasilApiCnpj>(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    { retries: 2, delayMs: 800 },
  ).catch(() => null);
  if (!raw) return 0;

  const socios = parseSocios(raw);
  for (const s of socios) {
    await prisma.socio.upsert({
      where: { cnpj_doc_nome: { cnpj: s.cnpj, doc: s.doc, nome: s.nome } },
      update: {},
      create: s,
    });
  }
  return socios.length;
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/ingestion/receita/socios.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sócios via BrasilAPI (on-demand cache)"
```

---

## Task 7: Substituir o flag de emendas por concentração em beneficiários

Destinar emendas ao próprio estado é normal. Trocamos o sinal por concentração em poucos
**beneficiários** (CNPJs/entidades). A função pura muda de assinatura; o data layer passa a nova entrada.

**Files:**
- Modify: `src/analysis/emendas.ts`
- Modify: `tests/analysis/emendas.test.ts`
- Modify: `src/data/parlamentares.ts` (montar `porBeneficiario` a partir dos `Favorecido`)

- [ ] **Step 1: Reescrever o teste (falha)**

Replace `tests/analysis/emendas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { redFlagEmendas } from "../../src/analysis/emendas";

describe("redFlagEmendas", () => {
  it("alerta quando as emendas concentram em um beneficiário", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porBeneficiario: [{ nome: "Construtora XPTO", valor: 900000 }, { nome: "Outra", valor: 100000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("Construtora XPTO");
    expect(rf.fraseSimples).toContain("90%");
  });

  it("ok quando distribuído entre vários beneficiários", () => {
    const rf = redFlagEmendas({
      total: 900000,
      porBeneficiario: [
        { nome: "A", valor: 300000 }, { nome: "B", valor: 300000 }, { nome: "C", valor: 300000 },
      ],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há beneficiários rastreáveis", () => {
    const rf = redFlagEmendas({ total: 0, porBeneficiario: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/analysis/emendas.test.ts`
Expected: FAIL (assinatura antiga usa `porMunicipio`).

- [ ] **Step 3: Reescrever a função**

Replace the body of `src/analysis/emendas.ts`:
```ts
import type { RedFlag } from "./types";

export interface EmendasInput {
  total: number;
  porBeneficiario: Array<{ nome: string; valor: number }>;
}

export function redFlagEmendas(i: EmendasInput): RedFlag {
  const base = {
    id: "emendas",
    titulo: "Destino das emendas",
    fonte: "Portal da Transparência — Emendas e execução",
  };
  if (i.total <= 0 || i.porBeneficiario.length === 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem beneficiários rastreáveis no período." };
  }
  const maior = i.porBeneficiario.reduce((m, x) => (x.valor > m.valor ? x : m), { nome: "", valor: 0 });
  const concentracao = maior.valor / i.total;
  const pct = Math.round(concentracao * 100);
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7) nivel = "alerta";
  else if (concentracao >= 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Emendas distribuídas entre vários beneficiários."
      : `${pct}% das emendas foram para um só beneficiário (${maior.nome}). Vale entender o porquê.`;
  return { ...base, nivel, fraseSimples: frase };
}
```

- [ ] **Step 4: Ajustar o data layer**

In `src/data/parlamentares.ts`, dentro de `fichaDeAgregados`, substituir o bloco de emendas por
município por agregação por beneficiário. Trocar o tipo em `AgregadosParlamentar`:
```ts
  // era: emendas: { municipioBeneficiario: string | null; valorEmpenhado: number }[];
  beneficiarios: { nome: string; valorPago: number }[];
```
E no corpo:
```ts
  const totalEmendas = a.beneficiarios.reduce((s, b) => s + b.valorPago, 0);
  const porBeneficiario = groupSum(a.beneficiarios, (b) => b.nome, (b) => b.valorPago)
    .map(([nome, valor]) => ({ nome, valor }));
  // ...
  emendas: { total: totalEmendas, porBeneficiario },
```
E nas queries de `obterPerfil`/`listarComRadar`, trocar `prisma.emenda.findMany` por
`prisma.favorecido.findMany({ where: { parlamentarId... }, select: { nome: true, valorPago: true } })`
(agregando por `nome`). Remover o helper `ehMunicipioReal` (não é mais usado). Ajustar os mapas em
`listarComRadar` de `emendasPorId` para `beneficiariosPorId` com `{ nome, valorPago }`.

- [ ] **Step 5: Rodar e confirmar passa**

Run: `npm test` (full) e `npx tsc --noEmit`
Expected: verde (ajuste imports/tipos até passar).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: red flag de emendas por concentração em beneficiários"
```

---

## Task 8: `data/investigacao.ts` — montar conexões do banco

**Files:**
- Create: `src/data/investigacao.ts`
- Test: `tests/data/investigacao.test.ts`

- [ ] **Step 1: Teste de integração (falha)**

Create `tests/data/investigacao.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { obterConexoes } from "../../src/data/investigacao";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "inv-1", nome: "Fulano Teste", uf: "SP" } });
  id = p.id;
  await prisma.doacao.create({ data: { parlamentarId: id, doadorNome: "João da Silva", doadorDoc: "***.456.789-**", valor: 5000, ano: 2022 } });
  await prisma.favorecido.create({ data: { parlamentarId: id, codigoEmenda: "E1", doc: "12.345.678/0001-90", nome: "Construtora XPTO", tipoPessoa: "PJ", valorPago: 900000, ano: 2024 } });
  await prisma.socio.create({ data: { cnpj: "12345678000190", nome: "João da Silva", doc: "***.456.789-**" } });
});
afterAll(async () => {
  await prisma.conexao.deleteMany({ where: { parlamentarId: id } });
  await prisma.socio.deleteMany({ where: { cnpj: "12345678000190" } });
  await prisma.favorecido.deleteMany({ where: { parlamentarId: id } });
  await prisma.doacao.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("obterConexoes", () => {
  it("encontra o vínculo doador↔sócio de beneficiário", async () => {
    const cx = await obterConexoes(id);
    expect(cx.length).toBeGreaterThanOrEqual(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].empresaNome).toBe("Construtora XPTO");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/data/investigacao.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/data/investigacao.ts`:
```ts
import { prisma } from "../db/client";
import { soDigitos } from "../lib/texto";
import { detectarConexoes, type Conexao, type BeneficiarioInput } from "../analysis/conexoes";

export async function obterConexoes(parlamentarId: string): Promise<Conexao[]> {
  const [doacoes, favorecidos] = await Promise.all([
    prisma.doacao.findMany({ where: { parlamentarId } }),
    prisma.favorecido.findMany({ where: { parlamentarId } }),
  ]);
  if (doacoes.length === 0 || favorecidos.length === 0) return [];

  const cnpjs = [...new Set(favorecidos.filter((f) => f.tipoPessoa === "PJ").map((f) => soDigitos(f.doc)))];
  const sociosRows = cnpjs.length
    ? await prisma.socio.findMany({ where: { cnpj: { in: cnpjs } } })
    : [];
  const sociosPorCnpj = new Map<string, { nome: string; doc: string }[]>();
  for (const s of sociosRows) {
    const arr = sociosPorCnpj.get(s.cnpj) ?? [];
    arr.push({ nome: s.nome, doc: s.doc });
    sociosPorCnpj.set(s.cnpj, arr);
  }

  const beneficiarios: BeneficiarioInput[] = favorecidos.map((f) => ({
    doc: f.doc,
    nome: f.nome,
    tipoPessoa: f.tipoPessoa === "PJ" ? "PJ" : "PF",
    valorPago: f.valorPago,
    ano: f.ano,
    socios: sociosPorCnpj.get(soDigitos(f.doc)) ?? [],
  }));

  return detectarConexoes({
    doadores: doacoes.map((d) => ({ nome: d.doadorNome, doc: d.doadorDoc, valor: d.valor, ano: d.ano })),
    beneficiarios,
  });
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/data/investigacao.test.ts` (Postgres up)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: obterConexoes (data layer da investigação)"
```

---

## Task 9: Frontend — seção "Investigação" com aviso probabilístico

**Files:**
- Create: `src/components/ConexaoCard.tsx`
- Create: `src/components/InvestigacaoSecao.tsx`
- Modify: `src/app/parlamentar/[id]/page.tsx`
- Test: `tests/app/investigacao.test.tsx`

- [ ] **Step 1: Teste (falha)**

Create `tests/app/investigacao.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestigacaoSecao } from "@/components/InvestigacaoSecao";

describe("InvestigacaoSecao", () => {
  it("mostra a conexão, o grau de confiança e o aviso de natureza probabilística", () => {
    const html = renderToStaticMarkup(
      <InvestigacaoSecao
        conexoes={[
          {
            tipo: "SOCIO", doadorNome: "João da Silva", doadorDoc: "***.456.789-**",
            empresaCnpj: "12.345.678/0001-90", empresaNome: "Construtora XPTO",
            valorDoacao: 5000, valorEmenda: 900000, ano: 2024, confianca: "alta",
          },
        ]}
      />,
    );
    expect(html).toContain("Construtora XPTO");
    expect(html).toContain("possível vínculo");
    expect(html).toContain("confira");
    expect(html).toContain("Confiança"); // selo de confiança visível
  });

  it("estado vazio quando não há conexões", () => {
    const html = renderToStaticMarkup(<InvestigacaoSecao conexoes={[]} />);
    expect(html).toContain("Nenhuma conexão");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/app/investigacao.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar os componentes**

Create `src/components/ConexaoCard.tsx`:
```tsx
import type { Conexao, Confianca } from "@/analysis/conexoes";

const CONF_ROTULO: Record<Confianca, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const CONF_COR: Record<Confianca, string> = {
  alta: "var(--ds-alerta)", media: "var(--ds-atencao)", baixa: "var(--ds-muted)",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ConexaoCard({ c }: { c: Conexao }) {
  return (
    <article className="rounded-lg border p-4" style={{ borderColor: "var(--ds-hair)", backgroundColor: "var(--ds-card)" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ds-muted)" }}>
          {c.tipo === "SOCIO" ? "Doador é sócio de beneficiária" : "Doador foi beneficiário"}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: CONF_COR[c.confianca], border: `1px solid ${CONF_COR[c.confianca]}` }}
        >
          Confiança {CONF_ROTULO[c.confianca]}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed">
        <strong>{c.doadorNome}</strong> doou {brl(c.valorDoacao)} para a campanha
        {c.empresaNome ? <> e é sócio da <strong>{c.empresaNome}</strong></> : null}, que recebeu{" "}
        {brl(c.valorEmenda)} de emenda em {c.ano}.
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--ds-muted)" }}>
        Possível vínculo — confira nas fontes oficiais (TSE e Portal da Transparência).
      </p>
    </article>
  );
}
```
Create `src/components/InvestigacaoSecao.tsx`:
```tsx
import type { Conexao } from "@/analysis/conexoes";
import { ConexaoCard } from "@/components/ConexaoCard";

export function InvestigacaoSecao({ conexoes }: { conexoes: Conexao[] }) {
  return (
    <section aria-labelledby="investigacao" className="mt-8">
      <h2 id="investigacao" className="text-xl font-semibold tracking-tight">
        Investigação — doações × emendas
      </h2>
      <p
        className="mt-2 rounded-lg border p-3 text-[13px] leading-relaxed"
        style={{ borderColor: "var(--ds-atencao)", background: "var(--ds-atencao-bg)", color: "var(--ds-ink)" }}
      >
        <strong>Atenção:</strong> estes são <strong>possíveis vínculos</strong>, inferidos por
        correspondência aproximada de dados públicos (nomes e dígitos parciais de CPF). Podem conter
        homônimos ou erros e <strong>não comprovam irregularidade</strong>. Use como ponto de partida
        e confira sempre nas fontes oficiais.
      </p>
      {conexoes.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ds-muted)" }}>
          Nenhuma conexão encontrada nos dados públicos disponíveis.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conexoes.map((c, i) => (
            <li key={i}>
              <ConexaoCard c={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/app/investigacao.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Integrar no perfil**

In `src/app/parlamentar/[id]/page.tsx`: import `obterConexoes` from `@/data/investigacao` and
`InvestigacaoSecao` from `@/components/InvestigacaoSecao`; after obtaining `perfil`, add
`const conexoes = await obterConexoes(id);` and render `<InvestigacaoSecao conexoes={conexoes} />`
before the `AvisoEtico` section.

- [ ] **Step 6: Rodar full + build**

Run: `npm test` e `npx tsc --noEmit` e `npm run build`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seção Investigação no perfil com aviso probabilístico"
```

---

## Task 10: Orquestração da ingestão investigativa

**Files:**
- Modify: `src/ingestion/run-all.ts`
- Modify: `package.json` (script `ingest:investigacao`)
- Test: `tests/ingestion/run-all.test.ts` (estender `ordemDeIngestao`)

- [ ] **Step 1: Estender o teste de ordem (falha)**

In `tests/ingestion/run-all.test.ts`, add:
```ts
  it("ingere doações e favorecidos antes de sócios e conexões", () => {
    const ordem = ordemDeIngestao();
    expect(ordem.indexOf("doacoes")).toBeLessThan(ordem.indexOf("socios"));
    expect(ordem.indexOf("favorecidos")).toBeLessThan(ordem.indexOf("socios"));
  });
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test tests/ingestion/run-all.test.ts`
Expected: FAIL.

- [ ] **Step 3: Atualizar `ordemDeIngestao` + main**

In `src/ingestion/run-all.ts`:
- Update `ordemDeIngestao()` to return
  `["deputados", "senadores", "despesas", "proposicoes", "votacoes", "emendas", "doacoes", "favorecidos", "socios", "conexoes"]`.
- Add a separate `mainInvestigacao()` (chamada pelo novo script) que:
  1. `ingestDoacoes("data/tse/receitas_2022.csv")` (e 2018 se presente), dentro de try/catch.
  2. Para cada emenda no banco, `ingestFavorecidos(parlamentarId, codigoEmenda, ano)` (try/catch por emenda).
     (Requer guardar `codigoEmenda` na tabela `Emenda` — se ainda não existir, adicionar o campo na
     ingestão de emendas: incluir `codigoEmenda` no modelo/parse da Task 9 de emendas do plano
     anterior; se ausente, adicionar migration `emenda_codigo` e preencher na ingestão.)
  3. Para cada CNPJ de `Favorecido` (PJ), `enrichSocios(doc)` (com cache).
  4. Persistir conexões: para cada parlamentar com doações+favorecidos, `obterConexoes(id)` e gravar
     em `Conexao` (deleteMany + createMany por parlamentar).
- Guardar `mainInvestigacao` atrás de `process.argv[1]?.includes("investigacao")` OU integrar ao
  `run-all` principal após emendas. Manter o guard existente.

Add to `package.json` scripts: `"ingest:investigacao": "tsx src/ingestion/run-all.ts investigacao"`.

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npm test tests/ingestion/run-all.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: orquestração da ingestão investigativa"
```

---

## Encerramento

- [ ] **Suíte completa:** `npm test` → verde; `npx tsc --noEmit` → limpo; `npm run build` → OK.
- [ ] **Smoke real (manual):** baixar `data/tse/receitas_2022.csv`, rodar `npm run ingest` e
      `npm run ingest:investigacao`, abrir um perfil com conexões e conferir a seção Investigação
      (com o aviso probabilístico e os selos de confiança).
- [ ] **README:** documentar a URL do CSV do TSE, o `npm run ingest:investigacao`, e a dependência
      da `PORTAL_TRANSPARENCIA_API_KEY` + BrasilAPI (rate limit).
- [ ] **Commit final** do README.

## Notas / dependências entre tarefas
- `codigoEmenda` precisa existir na tabela `Emenda` para a Task 5/10 casarem favorecidos à emenda.
  Se o modelo atual de `Emenda` não tiver `codigoEmenda`, a primeira sub-tarefa da Task 10 adiciona o
  campo + migration e passa a gravá-lo na ingestão de emendas (ajuste o `parseEmendas`/`ingestEmendas`
  para incluir `codigoEmenda`).
- Fatias futuras: parentesco (fora), fornecedores finais de transferências a municípios, base Receita
  completa, médias reais de pares, associação de emenda por código de autor.
```
