# "Como votaram por você" — Design

**Status:** aprovado no brainstorm (2026-08-18)

## Missão (reposicionamento)

De *"esse político é corrupto?"* (o dado aberto não sustenta) para
*"seus representantes votaram como você esperava nas pautas que importam?"*.

O app deixa de prometer detecção de corrupção como manchete e passa a entregar
o valor que o dado realmente permite e que os concorrentes não fazem: **tornar
o registro de votos legível e pessoal**, servindo diretamente a decisão de voto
do cidadão.

## Experiência (registro-primeiro, por pauta)

1. A pessoa escolhe o **estado (UF)**.
2. O app lista as **pautas que importam** (Câmara + Senado). Cada pauta traz
   linguagem cidadã: **título claro**, *o que era*, e *o que significou votar
   Sim / votar Não*.
3. Em cada pauta, **como a bancada do estado votou**: agrupado em Sim / Não /
   Abstenção / Obstrução / Faltou, com os nomes.
4. Clicar num parlamentar abre o **boletim** dele (reaproveita a seção de
   votações do perfil que já existe em `/parlamentar/[id]/votacoes`).

Rota nova: `/como-votaram` (com `?uf=PE`).

## Dados

### 1. Votações do Senado (fonte nova)
- Fonte: `legis.senado.leg.br/dadosabertos`. O endpoint por intervalo
  (`/plenario/lista/votacao/{ini}/{fim}`, máx. 60 dias) devolve votações com
  voto por senador; está marcado como descontinuado — na implementação,
  confirmar o endpoint substituto (`/dadosabertos/votacao`) e seus parâmetros.
- Casa `SENADO` já existe em `Votacao`. Senadores já estão em `Parlamentar`
  (casa SENADO). Casar `CodigoParlamentar` do Senado ao `externalId` do senador.
- **Votação secreta** (`Secreta: "S"`): o voto individual vem como "Votou",
  sem direção. Guardar como `SIGILOSO` (novo valor de voto ou flag) e exibir
  como "voto sigiloso" — nunca inventar Sim/Não.

### 2. Camada de legibilidade (IA)
Novos campos em `Votacao` (todos nullable):
- `resumoCidadao` — "o que era", 1-2 frases.
- `significadoSim`, `significadoNao` — o que cada lado representou.
- `legibilidadeRevisada Boolean @default(false)` — true nas marcantes conferidas.

Pipeline de ingestão (batch, não em request): para cada votação-destaque, um
LLM gera os campos acima **ancorado** em `descricao` + ementa da proposição +
resultado (aprovado/rejeitado). Restrições: formato fixo (JSON), não afirmar
além do texto, marcar baixa confiança. As ~10-20 marcantes recebem conferência
humana e `legibilidadeRevisada = true`. O `titulo` curado já existente continua
tendo prioridade sobre o gerado.

### 3. Pautas que importam
Reaproveita a heurística de importância + curadoria (`destaque`) que já existem,
agora também para o Senado. Uma "pauta" é uma `Votacao` com legibilidade
preenchida e `destaque != false`.

## Camada de acesso a dados

`src/data/pautas.ts`:
- `pautasQueImportam(limite)` — as votações-destaque (ambas as casas) com a
  legibilidade, ordenadas por relevância (curadas primeiro).
- `votosPorUf(votacaoIds, uf)` — para as pautas dadas, os votos dos
  parlamentares daquele estado, agrupados por voto, com nome/partido/casa.

## UI

- `src/app/como-votaram/page.tsx` — seletor de UF + lista de pautas.
- Componente de pauta: título, resumo, "Sim significou / Não significou", e a
  bancada do estado agrupada por voto (chips com nomes clicáveis → perfil).
- Selo "revisado" nas pautas conferidas; aviso de "voto sigiloso" quando secreta.
- Entrada a partir da home (link/destaque) e do topo (TopNav).

## Honestidade (explícito na tela)
- Senado tem votação secreta → mostrado como sigiloso, sem direção.
- Senado vota nominalmente menos → menos pautas de lá.
- Tradução por IA nas não-marcantes pode ter imprecisão → selo "revisado" só
  onde houve conferência.

## Escopo v1
- Ingestão de votações do Senado (foco nas não-secretas; secretas marcadas).
- Legibilidade IA no conjunto-destaque (~10-20), revisadas.
- Rota `/como-votaram` por pauta, com drill-down reusando o boletim do perfil.
- Ampliar a tradução para mais votações fica para depois.

## Testes
- Parse de votação do Senado (puro) + mapeamento de voto secreto.
- Prompt/parse da legibilidade IA: função pura que valida/normaliza o JSON do
  LLM (o LLM em si é mockado nos testes).
- `pautasQueImportam` e `votosPorUf` (integração com banco).
- Render da página `/como-votaram` (mockado).

## Não-objetivos
- Não é quiz de alinhamento (registro-primeiro, sem input de posição do cidadão).
- Não promete detectar corrupção; o cruzamento doador↔beneficiário continua
  como "pistas com fonte", secundário.
