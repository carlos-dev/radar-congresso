# Radar do Congresso

Aplicação web para o cidadão brasileiro **acompanhar e entender** o que deputados
federais e senadores fazem — em linguagem clara, sem juridiquês, sempre com a
fonte oficial de cada informação.

> A pergunta que o app responde não é *"esse político é corrupto?"* (o dado
> aberto não sustenta isso) — e sim **"seus representantes votaram como você
> esperava nas pautas que importam?"**.

## O que ele faz

- **Perfil por parlamentar** com quatro sinais ("red flags") explicados em
  português simples: presença nas votações, uso da cota (CEAP), destino das
  emendas e produção legislativa. Cada sinal usa o **percentil real** frente aos
  pares da mesma casa (ex.: *"gastou mais que 87% dos colegas"*), não constantes
  chutadas.
- **Como votaram por você** — o cidadão escolhe seu estado e vê como a bancada
  votou nas pautas que importam, com o significado de cada voto (o que era, o
  que significou votar *Sim* e *Não*) traduzido para linguagem cidadã.
- **Rankings** — quem mais gastou a cota, mais destinou emendas, mais apresentou
  projetos e mais faltou (com ressalvas honestas de cobertura).
- **Ficha eleitoral (TSE)** — elegibilidade e evolução do patrimônio declarado
  entre eleições.
- **Telas de detalhe** por tema, com quebra temporal (gráficos), status de
  tramitação dos projetos e beneficiários das emendas.
- **Investigação** (secundária) — cruzamento doador de campanha ↔ beneficiário
  de emenda/cota, apresentado como *pistas a investigar, com fonte* — nunca como
  acusação.

Presunção de inocência, natureza probabilística explícita na interface e fonte
oficial em cada dado são princípios do projeto.

## Stack

- **Next.js 16** (App Router, Server Components) + **TypeScript** + **Tailwind v4**
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Vitest** para testes
- **Claude (Anthropic)** para o pipeline de tradução de votações em linguagem
  cidadã

## Fontes de dados (todas públicas e oficiais)

| Fonte | O que traz |
|-------|-----------|
| Câmara dos Deputados — Dados Abertos | deputados, votações nominais, proposições, cota (CEAP) |
| Senado Federal — Dados Abertos | senadores e votações nominais |
| Portal da Transparência | emendas parlamentares e beneficiários |
| TSE | candidaturas, doações de campanha e patrimônio declarado |
| BrasilAPI | quadro societário (QSA) de empresas |

A ingestão prioriza **arquivos em massa** (CSV/ZIP anuais) sobre APIs por-item —
mais rápido, completo e resistente a rate limit. Um parser de CSV que respeita
aspas (`src/lib/csv.ts`) evita a corrupção de linhas típica do `split(";")`.

## Decisões de engenharia que valem contar

- **Reposicionamento honesto.** A ideia inicial era detectar corrupção cruzando
  dados. Depois de ingerir ~180 mil beneficiários de emenda e buscar milhares de
  quadros societários, ficou claro que o cruzamento acha quase nada — a maior
  parte da emenda vai a entes públicos sem dono privado. Em vez de forçar um
  sinal que não existe, o app foi reposicionado para o valor que o dado realmente
  entrega: tornar o registro de voto legível e pessoal.
- **Autoria como muitos-para-muitos.** Uma proposição tem vários autores; o
  "autor principal" é quem tem a 1ª assinatura (não o campo `proponente`, que
  vem marcado em vários). Isso corrige a contagem de produção legislativa.
- **Legibilidade por IA com salvaguardas.** Um pipeline em lote usa um LLM para
  traduzir o juridiquês da votação em linguagem cidadã, **ancorado no texto
  oficial** e no título curado, com validação de saída e revisão humana nas
  pautas marcantes — para não inventar o tema nem a direção do voto.
- **Sinais calibrados para não dar falso alerta.** Ex.: concentrar a cota num
  único fornecedor só é "atenção" em categorias discricionárias (divulgação,
  consultoria) — em transporte ou aluguel, concentrar é operacional e normal.

## Rodando localmente

Pré-requisitos: Node 20+, Docker (para o Postgres).

```bash
# 1. Banco
docker compose up -d

# 2. Variáveis de ambiente (veja .env.example)
cp .env.example .env      # preencha DATABASE_URL, PORTAL_TRANSPARENCIA_API_KEY, ANTHROPIC_API_KEY

# 3. Dependências + schema
npm install
npx prisma migrate deploy && npx prisma generate

# 4. App
npm run dev               # http://localhost:3000
```

Testes: `npm test`.

## Ingestão de dados

A carga usa scripts dedicados em `src/ingestion/` (executados com `tsx`), por
fonte — deputados/senadores, votações (arquivo em massa da Câmara/Senado), cota,
proposições + autoria, emendas + beneficiários, candidaturas/patrimônio (TSE) e
a tradução de votações por IA. Cada um é idempotente e casa os registros por id
oficial, CPF ou nome normalizado, conforme a fonte permite.

## Limitações honestas

- A cota (CEAP) cobre o ano de referência mais recente; o histórico multi-ano é
  um próximo passo.
- O Senado vota nominalmente menos que a Câmara e tem votações secretas
  (sabatinas etc.) — estas aparecem como "voto sigiloso", sem inventar direção.
- As explicações em linguagem cidadã das pautas não-marcantes são geradas
  automaticamente; as marcantes são revisadas.

---

Projeto pessoal, em evolução. Dados de fontes públicas oficiais; nenhuma
informação aqui é acusação — é ponto de partida para o cidadão investigar.
