# Design — Motor de Cruzamento Investigativo (v1 / Fatia 2)

- **Data:** 2026-08-16
- **Projeto:** radar-congresso
- **Status:** Aprovado no brainstorming; aguardando revisão do spec

## 1. Contexto e objetivo

O app hoje agrega dados e calcula 4 red flags básicos, mas não **investiga** — que é o
diferencial prometido desde o início. Esta fatia entrega o primeiro motor investigativo: cruzar
**doadores de campanha** com **beneficiários de emendas** para revelar possíveis vínculos.

**Achado alvo (v1):**
> Um **doador (pessoa física)** da campanha do parlamentar é **sócio de uma empresa que recebeu
> dinheiro de emenda** dele — ou o próprio CPF do doador aparece como favorecido de emenda.

Isto é apresentado **sempre como possível vínculo a investigar**, com o rastro do dinheiro e as
fontes oficiais — **nunca como acusação ou prova de crime**.

### Fato jurídico que molda o desenho
Desde 2015, **empresas não podem doar para campanhas** no Brasil (apenas pessoas físicas, recursos
próprios e fundos partidários). Logo, "empresa doadora que virou beneficiária" não existe para
eleições de 2016 em diante. O vínculo relevante é **CPF de doador ↔ sócio de empresa beneficiária**.

## 2. Não-objetivos (fora do escopo do v1)
- **Parentesco**: não há base pública confiável de parentesco; inferir por sobrenome gera acusação
  falsa. Cortado por inviabilidade e risco.
- **Fornecedor final de transferências a municípios**: quando a emenda é transferência a uma
  prefeitura, o rastro em dado aberto para na prefeitura; o fornecedor final não é ligado à emenda.
  Cobrimos apenas favorecidos privados nomeados na execução.
- **Importar a base CNPJ completa da Receita** (dezenas de GB): usamos consulta de sócios sob demanda.
- Cruzamentos além de doador↔beneficiário (ex.: cota/CEAP × doador) — fatias futuras.

## 3. Arquitetura

Constrói sobre o pipeline existente (`ingestão → Postgres → análise → Next.js`).

```
TSE (doações)            ─┐
Emenda → favorecido      ─┼─►  matching (funções puras)  ─►  Conexões  ─►  seção "Investigação"
Sócios (BrasilAPI)       ─┘                                                   no perfil
```

### Fontes de dados (novas)
- **TSE — doações de campanha**: CSVs de dados abertos (`receitas_candidatos_<ano>`), eleições
  **2022** (deputados + senadores eleitos em 2022) e **2018** (senadores da renovação anterior).
  Extrai por candidato: nome do doador, CPF/CNPJ do doador (originário), valor, ano.
- **Emenda → favorecido**: enriquecer cada emenda já ingerida com o CNPJ/CPF que **recebeu**, via
  os documentos de empenho/pagamento do Portal da Transparência. Filtrar para favorecidos
  **privados** (descartar CNPJ de órgão público / prefeitura).
- **Sócios (QSA)**: para cada CNPJ beneficiário, buscar o quadro societário **sob demanda** via
  BrasilAPI (`/api/cnpj/v1/{cnpj}`), com cache no banco. Não importar a base inteira.

### Componentes (unidades focadas)
- `src/ingestion/tse/doacoes.ts` — `parseDoacoes` (puro) + `ingestDoacoes` (por eleição/candidato).
- `src/ingestion/transparencia/favorecidos.ts` — `parseFavorecidos` + `ingestFavorecidos(emenda)`.
- `src/ingestion/receita/socios.ts` — `parseSocios` + `enrichSocios(cnpj)` (BrasilAPI + cache).
- `src/analysis/conexoes.ts` — `detectarConexoes(dados)` **função pura**: recebe doadores +
  beneficiários (+ sócios) e retorna `Conexao[]` com grau de confiança. Testável isoladamente.
- `src/data/investigacao.ts` — monta os inputs do banco e chama `detectarConexoes`.
- Frontend: seção "Investigação" no perfil + novo card de beneficiários.

### Modelos Prisma (novos)
- `Doacao { id, parlamentarId, doadorNome, doadorDoc, valor, ano, cargo }`
- `Favorecido { id, emendaId (ou parlamentarId+codigoEmenda), doc, nome, valorPago }`
- `Socio { id, cnpj, nome, doc }` (cache do QSA; `@@unique([cnpj, doc])`)
- `Conexao` — **materializada** para exibição: `{ id, parlamentarId, tipo (DIRETA|SOCIO),
  doadorNome, doadorDoc, empresaCnpj, empresaNome, valorDoacao, valorEmenda, ano, confianca }`.

## 4. Lógica de cruzamento (`detectarConexoes`)
Para cada parlamentar:
- `doadores = { docNormalizado, nomeNormalizado, valor, ano }` (do TSE).
- `beneficiarios = { cnpj, nome, valorPago }` (favorecidos privados das emendas) e, para cada,
  `socios = { docNormalizado, nomeNormalizado }` (BrasilAPI).
- **Match direto**: doc do doador == doc do favorecido → Conexão `DIRETA`.
- **Match indireto**: doc/nome do doador casa com um sócio do beneficiário → Conexão `SOCIO`.
- **Confiança**: como o CPF é parcialmente mascarado (ver §5), o match usa **nome normalizado +
  dígitos visíveis do CPF**. Confiança = `alta` (dígitos visíveis + nome batem), `media` (só nome
  forte), `baixa` (nome parcial). Conexões de confiança muito baixa são descartadas.

## 5. Natureza probabilística — REQUISITO DE INTERFACE
O CPF é **parcialmente mascarado** no TSE e na base de sócios (ex.: `***.456.789-**`). Portanto o
cruzamento é por **nome normalizado + dígitos visíveis do CPF** → resultado **probabilístico**.

**A interface DEVE deixar isso explícito e visível** (não em nota de rodapé escondida):
- Cada conexão traz um selo de **grau de confiança** (alta/média/baixa) e o texto "**possível
  vínculo — confira**".
- Um aviso claro na seção: os vínculos são **inferidos por correspondência aproximada** de dados
  públicos, podem conter homônimos/erros, e **não comprovam irregularidade**.
- Sempre exibir o **rastro** (doador → doação → empresa → emenda) e **links para as fontes**
  oficiais, para o cidadão verificar por conta própria.
- Nunca usar linguagem que afirme crime, culpa ou intenção.

## 6. Correção do flag de emendas (ponto levantado)
Destinar emendas ao próprio estado é **normal**, não é alerta. Substituir o flag de "concentração
por município/estado" por **"concentração em poucos beneficiários (CNPJs/entidades)"** — que é o
sinal relevante e serve de base para o cruzamento.

## 7. Riscos e mitigações
- **Mascaramento de CPF** → matching probabilístico. Mitigado por confiança + linguagem "possível"
  + fontes + verificação humana (§5).
- **TSE candidato → parlamentar** (homônimos): casar por nome + UF + cargo + ano; sinalizar
  ambiguidade e preferir não exibir a duvidar.
- **Emenda → favorecido** só onde a execução nomeia favorecido privado (transferências a municípios
  não rastreáveis) — comunicar a cobertura parcial.
- **BrasilAPI rate limit**: consulta sob demanda + cache em `Socio`; degradar com elegância.
- **Endpoints do Portal de documentos de emenda**: confirmar formato exato na implementação.

## 8. Critérios de sucesso (v1)
- Perfil mostra uma seção "Investigação" com as conexões encontradas (ou "nenhuma conexão
  encontrada nos dados públicos") — cada uma com rastro, confiança, "possível vínculo" e fontes.
- Doações e favorecidos ingeridos e visíveis; sócios buscados sob demanda e cacheados.
- `detectarConexoes` coberto por testes unitários (matching direto, indireto, homônimo, mascarado).
- Novo flag de concentração por beneficiário substitui o de estado.

## 9. Testes
- `detectarConexoes` (puro): fixtures cobrindo match direto, match por sócio, homônimo (nomes iguais
  com dígitos de CPF diferentes → não casa), e confiança por nível.
- `parseDoacoes` / `parseFavorecidos` / `parseSocios`: normalização a partir de amostras reais.
- Ingestões: respostas mockadas; idempotência.
- Front: render da seção "Investigação" (com conexões e estado vazio) + presença do aviso de
  natureza probabilística.
