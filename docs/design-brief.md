# Design brief — Radar do Congresso (prompt para ferramenta de design)

Cole o texto abaixo na ferramenta (Claude design / Open design / v0 etc.). Ele especifica as duas telas,
os dados exatos que cada uma consome (para o código gerado bater com os nossos tipos) e a direção visual.

---

## PROMPT (copie a partir daqui)

Você é um designer de front-end sênior. Gere uma interface **React + Next.js (App Router) em TypeScript**, estilizada com **Tailwind CSS** e componentes **shadcn/ui**. Nada de CSS inline. Componentes pequenos, focados e reutilizáveis. Mobile-first e acessível (WCAG AA, navegação por teclado, contraste, `aria-*`).

### Produto
"Radar do Congresso": um app cívico que ajuda o cidadão brasileiro comum a fiscalizar deputados federais e senadores, em **linguagem simples, sem juridiquês**. Mostra a atuação do parlamentar e "sinais de alerta" (red flags) calculados a partir de dados públicos oficiais. Tom: **confiável, sóbrio, jornalístico — NÃO sensacionalista**. É uma ferramenta de transparência, não de denúncia. Deve transmitir credibilidade e neutralidade.

### Princípio ético (aparece na UI)
Red flags são **sinais para investigar, não acusações**. A tela de perfil deve deixar explícita a **presunção de inocência** e sempre mostrar a **fonte** de cada informação. Nunca usar linguagem que afirme culpa.

### Semântica de cores dos níveis (use em selos/badges e bordas dos cards)
- `ok` → verde ("Tudo certo")
- `atencao` → âmbar/amarelo ("Atenção")
- `alerta` → vermelho ("Sinal de alerta")
- `sem_dado` → cinza neutro ("Sem dados")
Escolha uma paleta acessível (contraste suficiente em light e dark). Suporte a **dark mode**.

### Tela 1 — Home / Busca (`app/page.tsx`, Server Component)
Consome:
```ts
type ParlamentarResumo = {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: "CAMARA" | "SENADO";
  urlFoto: string | null;
};
listarParlamentares(busca?: string): Promise<ParlamentarResumo[]>
```
Elementos:
- Cabeçalho com o nome "Radar do Congresso" e uma frase curta explicando o propósito ("Veja como seus deputados e senadores atuam — em linguagem simples").
- Um campo de **busca por nome** (form GET com `name="q"`, funciona sem JS — é Server Component).
- Uma **lista/grade de cards** de parlamentares. Cada card: foto (fallback quando `urlFoto` é null), nome em destaque, partido/UF, e um selo indicando a casa (Câmara/Senado). O card inteiro é um link para `/parlamentar/[id]`.
- Estado vazio amigável quando a busca não retorna nada.

### Tela 2 — Perfil (`app/parlamentar/[id]/page.tsx`, Server Component)
Consome:
```ts
type Nivel = "ok" | "atencao" | "alerta" | "sem_dado";
type RedFlag = { id: string; titulo: string; nivel: Nivel; fraseSimples: string; fonte: string };
type Ficha = { nivelGeral: Nivel; redFlags: RedFlag[] }; // sempre 4 red flags
type Perfil = ParlamentarResumo & { ficha: Ficha };
obterPerfil(id: string): Promise<Perfil | null>
```
Elementos:
- **Header do perfil**: foto, nome, partido/UF, casa, e um **selo de nível geral** (`ficha.nivelGeral`) com rótulo em linguagem simples.
- Seção "Ficha do parlamentar" com os **4 cards de red flag** (`ficha.redFlags`). Cada card (`RedFlagCard`): rótulo do nível + `titulo`, a `fraseSimples` (texto principal, linguagem coloquial), e um rodapé discreto "Fonte: {fonte}". Borda/acento na cor do nível.
- **Banner de aviso ético** ao final: explica que são sinais para investigar, não acusações, e reforça a presunção de inocência.
- Link de "voltar" para a home.

### Componentes que quero como arquivos separados
- `RedFlagCard` (recebe `rf: RedFlag`), cobrindo os 4 níveis via um mapa de config (cor + rótulo), sem `if` espalhado.
- `NivelBadge` (recebe `nivel: Nivel`) reutilizado no card do perfil e no selo geral.
- `ParlamentarCard` (recebe `p: ParlamentarResumo`) usado na lista da home.
- `SearchBar` (form GET).
- `AvisoEtico` (o banner de presunção de inocência).

### Requisitos técnicos
- Toda a cópia da interface em **português do Brasil**.
- Use componentes shadcn/ui onde fizer sentido (Card, Badge, Input, Button, Avatar, Alert).
- Sem chamadas de dados dentro dos componentes de UI — as páginas (Server Components) chamam `listarParlamentares`/`obterPerfil` e passam os dados via props. Os componentes são apresentacionais.
- Imagens: use `next/image` com `max-width: 100%`; trate `urlFoto` null com um avatar de fallback (iniciais do nome).
- Entregue: as duas páginas + os componentes listados, prontos para colar em `src/app/` e `src/components/`.

## (fim do prompt)

---

## Notas de integração (para quando o resultado voltar)
- Nossas funções de dados já existem em `src/data/parlamentares.ts` — só conectar.
- Os tipos `RedFlag`/`Nivel` vivem em `src/analysis/types.ts`; `ParlamentarResumo`/`Perfil` em `src/data/parlamentares.ts`. Reaproveitar esses tipos em vez de redefinir.
- Precisamos instalar Tailwind + shadcn/ui no projeto antes de colar (a base atual usa CSS inline).
