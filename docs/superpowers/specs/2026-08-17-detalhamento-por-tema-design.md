# Design — Detalhamento por Tema (perfil mais rico)

- **Data:** 2026-08-17
- **Projeto:** radar-congresso
- **Status:** Aprovado no brainstorming; aguardando revisão do spec

## 1. Contexto e objetivo
Os cards de red flag hoje resumem, mas não detalham — falta ver os gastos, as votações e os
projetos por trás de cada sinal. Esta fatia adiciona **páginas de detalhe por tema**, mantendo os
cards enxutos (ganham um link "Ver detalhes →"). Assim o cidadão vai do sinal ao dado bruto, com
fonte.

## 2. Não-objetivos
- Não expandir o conteúdo dentro do card (volume grande — 154k despesas, 23k proposições — estouraria).
- Sem gráficos/visualizações novas no v1 (listas + agregação simples).
- Sem busca/filtro avançado dentro das páginas de detalhe (só top-N/paginação).

## 3. Arquitetura
Constrói sobre o padrão atual (`Postgres → data layer → Next.js Server Components`).

### Rotas
- `src/app/parlamentar/[id]/[tema]/page.tsx` — página de detalhe, `tema ∈ cota | projetos | votacoes | emendas`.
  Server Component; mesmo visual (faixa escura com nome + link voltar); `notFound()` para tema inválido
  ou parlamentar inexistente.

### Data layer (`src/data/detalhe.ts`)
Funções focadas, cada uma paginável quando faz sentido:
- `detalheCota(id, ano)` → fornecedores agregados: `{ nome, doc, total, qtd }[]` ordenado por total desc,
  top 50; + total geral.
- `listaProjetos(id, pagina)` → proposições de autoria `{ tipo, ano, ementa }[]`, 30/página, com total.
- `listaVotacoes(id)` → votações nominais da casa com o voto do parlamentar `{ descricao, data, voto|"—" }[]`
  (cobertura limitada; aviso honesto na página).
- `listaEmendas(id)` → beneficiários `{ nome, doc, total }[]` agregados por doc, top 50 (onde há rastro).

### Card → detalhe
Cada `RedFlagCard` (ou a seção da ficha) ganha um link "Ver detalhes →" para
`/parlamentar/[id]/<tema>` correspondente ao `rf.id` (presenca→votacoes, despesas→cota,
legislativa→projetos, emendas→emendas). Só mostra o link quando o tema tem dado (nível ≠ sem_dado
ou contagem > 0).

## 4. Conteúdo de cada página
- **cota:** título "Uso da cota — {nome}", total do ano, tabela dos maiores fornecedores (nome, CNPJ,
  total, nº de documentos). Fonte: CEAP (arquivo em massa da Câmara).
- **projetos:** título "Produção legislativa — {nome}", contagem, lista paginada (tipo, ano, ementa).
  Fonte: Câmara — proposições de autoria.
- **votacoes:** título "Presença — {nome}", lista das votações nominais e o voto; aviso de que só
  votações nominais entram e a cobertura é parcial. Fonte: Câmara — votações.
- **emendas:** título "Destino das emendas — {nome}", beneficiários e valores; aviso de que o rastro
  público para em transferências a municípios. Fonte: Portal da Transparência.

## 5. Enquadramento (mantém)
Cada página repete a **fonte** e, onde couber, o aviso de limite/cobertura. Sem linguagem acusatória.

## 6. Testes
- Data layer: agregações testadas (cota por fornecedor, emendas por beneficiário) — com dados de
  fixture no banco (integração leve, como `tests/data/parlamentares.test.ts`).
- Front: render de cada página de detalhe (com dados e estado vazio) via `renderToStaticMarkup`;
  presença do link "Ver detalhes" no card.

## 7. Riscos
- **Volume:** cota/projetos podem ser grandes → top-N/paginação obrigatórios.
- **Votações:** poucas nominais ingeridas → página mostra pouco; comunicar honestamente.
- **Parâmetro de rota inválido:** validar `tema` e `notFound()`.

## 8. Critérios de sucesso
- A partir de um card, chego numa página com a lista real (fornecedores/projetos/votos/beneficiários),
  paginada onde grande, com fonte e avisos.
- Tema inválido → 404. Tudo em Server Components, sem depender de JS no cliente.
