import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/data/parlamentares";
import {
  detalheCota, listaProjetos, listaVotacoes, listaEmendas,
  type CotaDetalhe, type ProjetosPagina, type VotacaoDetalhe,
} from "@/data/detalhe";

const TEMAS = ["cota", "projetos", "votacoes", "emendas"] as const;
type Tema = (typeof TEMAS)[number];
const ANO = new Date().getFullYear() - 1;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const TITULO: Record<Tema, string> = {
  cota: "Uso da cota parlamentar",
  projetos: "Produção legislativa",
  votacoes: "Presença nas votações",
  emendas: "Destino das emendas",
};

type Props = {
  params: Promise<{ id: string; tema: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

export default async function DetalhePage({ params, searchParams }: Props) {
  const { id, tema } = await params;
  const { pagina: paginaStr } = await searchParams;
  if (!TEMAS.includes(tema as Tema)) notFound();
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();
  const t = tema as Tema;
  const pagina = Math.max(1, Number(paginaStr) || 1);

  // Busca os dados aqui (async) e passa a seções síncronas — assim a árvore
  // renderizada não tem componentes async (evita suspensão no SSR/testes).
  let conteudo: ReactNode = null;
  if (t === "cota") conteudo = <CotaView data={await detalheCota(id, ANO)} />;
  else if (t === "projetos") conteudo = <ProjetosView data={await listaProjetos(id, pagina)} pagina={pagina} />;
  else if (t === "votacoes") conteudo = <VotacoesView votos={await listaVotacoes(id)} />;
  else if (t === "emendas") conteudo = <EmendasView benef={await listaEmendas(id)} />;

  return (
    <main className="mx-auto w-full max-w-[900px] px-6 py-8">
      <Link href={`/parlamentar/${id}`} className="text-sm" style={{ color: "var(--ds-muted)" }}>
        ← Voltar para {perfil.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {TITULO[t]} — {perfil.nome}
      </h1>
      {conteudo}
    </main>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-sm" style={{ color: "var(--ds-muted)" }}>
      {children}
    </p>
  );
}

function Fonte({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-xs" style={{ color: "var(--ds-muted)" }}>
      {children}
    </p>
  );
}

function CotaView({ data }: { data: CotaDetalhe }) {
  if (data.fornecedores.length === 0) return <Aviso>Sem gastos de cota no período.</Aviso>;
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>
        Total em {ANO}: {brl(data.total)} · maiores fornecedores
      </p>
      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {data.fornecedores.map((f, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{f.nome}</span>
              <span className="text-xs" style={{ color: "var(--ds-muted)" }}>
                {f.doc ?? "—"} · {f.qtd} nota(s)
              </span>
            </span>
            <span className="font-semibold whitespace-nowrap">{brl(f.total)}</span>
          </li>
        ))}
      </ul>
      <Fonte>Fonte: Câmara — CEAP (cota parlamentar).</Fonte>
    </>
  );
}

function ProjetosView({ data, pagina }: { data: ProjetosPagina; pagina: number }) {
  if (data.total === 0) return <Aviso>Sem projetos de autoria registrados.</Aviso>;
  const paginas = Math.ceil(data.total / 30);
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>
        {data.total} projeto(s) de autoria
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {data.itens.map((p, i) => (
          <li key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--ds-hair)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--ds-muted)" }}>
              {p.tipo} · {p.ano}
            </span>
            <p className="text-sm">{p.ementa}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-4 text-sm">
        {pagina > 1 ? (
          <Link href={`?pagina=${pagina - 1}`} style={{ color: "var(--ds-primary-darker)" }}>
            ← anterior
          </Link>
        ) : null}
        {pagina < paginas ? (
          <Link href={`?pagina=${pagina + 1}`} style={{ color: "var(--ds-primary-darker)" }}>
            próxima →
          </Link>
        ) : null}
      </div>
      <Fonte>Fonte: Câmara — proposições de autoria.</Fonte>
    </>
  );
}

const VOTO_ROTULO: Record<string, string> = {
  SIM: "Sim", NAO: "Não", ABSTENCAO: "Abstenção", OBSTRUCAO: "Obstrução", AUSENTE: "Ausente",
};

function VotacoesView({ votos }: { votos: VotacaoDetalhe[] }) {
  if (votos.length === 0) return <Aviso>Sem votações nominais registradas no período.</Aviso>;
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
      <Fonte>Fonte: Câmara — votações.</Fonte>
    </>
  );
}

function EmendasView({ benef }: { benef: { nome: string; doc: string; total: number }[] }) {
  if (benef.length === 0)
    return (
      <Aviso>
        Sem beneficiários rastreáveis. Muitas emendas vão a fundos/prefeituras, cujo fornecedor final
        não é público.
      </Aviso>
    );
  return (
    <>
      <p className="mt-2 text-sm" style={{ color: "var(--ds-muted)" }}>
        Beneficiários com valor recebido
      </p>
      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {benef.map((b, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{b.nome}</span>
              <span className="text-xs" style={{ color: "var(--ds-muted)" }}>
                {b.doc}
              </span>
            </span>
            <span className="font-semibold whitespace-nowrap">{brl(b.total)}</span>
          </li>
        ))}
      </ul>
      <Fonte>Fonte: Portal da Transparência — execução de emendas.</Fonte>
    </>
  );
}
