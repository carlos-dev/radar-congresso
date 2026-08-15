# Design — Perfil do Político com Red Flags (MVP / Fatia 1)

- **Data:** 2026-08-15
- **Projeto:** radar-congresso (nome de trabalho, provisório)
- **Autor:** Carlos (@kyte.com.br)
- **Status:** Aprovado no brainstorming; aguardando revisão do spec

## 1. Contexto e objetivo

App web para o cidadão brasileiro **fiscalizar políticos federais** (513 deputados + 81 senadores)
e decidir melhor em quem votar. Diferencial central em relação a Congresso em Foco, De Olho em
Você e Ranking dos Políticos: **sinalizar corrupção/atividade suspeita em linguagem simples**,
sem juridiquês, culminando (fatias futuras) em cruzamento de dados estilo jornalismo investigativo.

Este documento descreve **apenas a Fatia 1 (MVP)**: o perfil do político com os primeiros
sinais de alerta. O cruzamento profundo (emendas × CNPJ × parentes × doadores) é a estrela-guia
do produto, mas fica para a Fatia 2, construída sobre a base de dados montada aqui.

### Não-objetivos (fora do escopo desta fatia)
- Esferas estadual e municipal (só federal por enquanto).
- Personalização "meus políticos" e alertas/notificações (fatia futura).
- Cruzamento profundo emendas × CNPJ × parentes × doadores (Fatia 2).
- App mobile nativo (web responsivo primeiro).

## 2. Decomposição do produto (visão macro)

O produto completo são 5 subsistemas independentes. Cada um vira seu próprio ciclo
spec → plano → implementação:

1. **Pipeline de dados** — ingestão e normalização de dados abertos → Postgres. *(parte desta fatia)*
2. **Motor de análise** — red flags e cruzamentos. *(red flags básicos nesta fatia; cruzamento na Fatia 2)*
3. **API + backend** — servir dados processados. *(nesta fatia, via Server Components lendo o Postgres)*
4. **Frontend web** — experiência intuitiva, perfis. *(parte desta fatia)*
5. **Personalização + alertas** — "meus políticos", push/e-mail. *(fatia futura)*

## 3. Arquitetura (Fatia 1)

```
Fontes abertas → Ingestão (jobs) → Postgres → Camada de análise → Next.js (web, App Router)
```

### Stack
- **Next.js (App Router)** + React, com Server Components lendo dados diretamente do banco.
- **Postgres** como fonte da verdade normalizada.
- **Drizzle ou Prisma** como ORM (decisão no plano de implementação; ambos servem).
- **TypeScript** em todo o código.
- Deploy alvo: Vercel (web) + Postgres gerenciado (ex: Neon/Supabase). Decisão final no plano.

### Componentes e responsabilidades

Cada unidade tem um propósito único e é testável isoladamente.

- **`jobs/ingestion/`** — um módulo por fonte de dados. Cada um: baixa da API oficial,
  normaliza para o schema interno, faz upsert no Postgres. Idempotente e re-executável.
  Fontes:
  - **API Dados Abertos da Câmara** — deputados, presença em votações nominais, despesas da
    cota parlamentar (CEAP), proposições de autoria.
  - **API do Senado Federal** — senadores e dados equivalentes.
  - **Portal da Transparência (API)** — emendas parlamentares e sua execução.
  - **TSE (dados abertos)** — dados de campanha/bens declarados (uso leve nesta fatia;
    central na Fatia 2).
- **`db/`** — schema, migrations e camada de acesso a dados. Fonte da verdade.
- **`analysis/`** — funções puras que recebem dados do banco e retornam red flags + "nota"
  em linguagem simples. Sem I/O direto; recebem dados como entrada → fáceis de testar.
- **`app/`** (Next.js) — rotas: busca/lista de políticos e página de perfil individual.
  Server Components lendo via `db/` e `analysis/`.

### Fluxo de dados
1. Jobs de ingestão rodam periodicamente (agendados) e atualizam o Postgres.
2. A camada de análise calcula red flags sob demanda (ou materializa em tabela, decisão no plano).
3. O frontend renderiza perfis a partir do banco + análise. Cada político = página indexável
   (SEO forte, para o app ser encontrado no Google).

## 4. Red flags do MVP

Derivados **somente de dados abertos oficiais**. Apresentados como **fato + contexto +
comparação com a média dos pares**, nunca como acusação.

1. **Presença baixa** em votações nominais.
2. **Gasto atípico da cota parlamentar (CEAP)** — total elevado e/ou concentrado em poucos fornecedores.
3. **Emendas concentradas** — % das emendas destinada a poucos municípios/beneficiários.
4. **Baixa produção legislativa** — proporção de projetos de autoria que efetivamente viram lei.
5. **Processos/condenações** — quando disponível em fonte oficial (Ficha Limpa / TSE).

### Linguagem
Traduzir números em frases que qualquer pessoa entende. Exemplo:
> "Faltou em 3 de cada 10 votações importantes — mais que a maioria dos colegas."

em vez de "índice de presença 0,72".

## 5. Ética e segurança (crítico neste domínio)

- Todo dado exibido tem **fato + fonte + link oficial**.
- "Sinal de alerta" **≠** "culpado": o texto sempre explica que é um padrão que merece atenção.
- **Presunção de inocência** declarada explicitamente na interface.
- Nunca afirmar crime; nunca inferir intenção. Só descrever o que os dados públicos mostram.

## 6. Testes

- **`analysis/`**: testes unitários com dados de entrada sintéticos (funções puras → cobertura alta).
- **`jobs/ingestion/`**: testes com respostas de API mockadas; verificar normalização e idempotência.
- **`app/`**: testes de renderização das páginas de perfil e busca com dados de fixture.

## 7. Riscos e mitigações

- **Disponibilidade/consistência de fonte de processos judiciais** — dados de processos são o
  ponto mais frágil. Mitigação: começar pelo que tem fonte oficial estável (Ficha Limpa/TSE) e
  degradar com elegância quando faltar dado.
- **Mudanças nas APIs oficiais** — isolar cada fonte em seu próprio módulo de ingestão para
  limitar o raio de impacto.
- **Risco jurídico/reputacional** — mitigado pelos princípios da seção 5.

## 8. Critérios de sucesso (MVP)

- Buscar qualquer deputado federal ou senador e ver um perfil legível.
- Perfil mostra os 5 red flags (quando houver dado), cada um com fato + fonte + comparação.
- Dados atualizáveis por re-execução dos jobs de ingestão.
- App demonstrável publicamente (deploy web).
