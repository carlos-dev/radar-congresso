import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/data/parlamentares";
import {
  detalheCota, listaProjetos, listaVotacoes, listaEmendas,
  type CotaDetalhe, type ProjetosPagina, type VotacoesDetalhe, type EmendasDetalhe,
} from "@/data/detalhe";
import { StatRow, StatCard, MiniColunas, BarraLinha } from "@/components/detalhe";

const TEMAS = ["cota", "projetos", "votacoes", "emendas"] as const;
type Tema = (typeof TEMAS)[number];
const ANO = new Date().getFullYear() - 1;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCurto = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k` : brl(n);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataBR = (d: Date) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

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
  else if (t === "votacoes") conteudo = <VotacoesView data={await listaVotacoes(id)} />;
  else if (t === "emendas") conteudo = <EmendasView data={await listaEmendas(id)} />;

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

function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 mb-1 text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ds-muted)" }}>
      {children}
    </h2>
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
  if (data.fornecedores.length === 0) return <Aviso>Sem gastos de cota em {ANO}.</Aviso>;
  const maiorMes = data.porMes.reduce((m, x) => (x.total > m.total ? x : m), data.porMes[0]);
  const topFrac = data.total > 0 ? data.fornecedores[0].total / data.total : 0;
  const maxForn = data.fornecedores[0].total || 1;
  return (
    <>
      <StatRow>
        <StatCard rotulo={`Total em ${ANO}`} valor={brl(data.total)} />
        <StatCard rotulo="Fornecedores" valor={String(data.numFornecedores)} />
        <StatCard rotulo="Mês de maior gasto" valor={MESES[maiorMes.mes - 1]} sub={brl(maiorMes.total)} />
        <StatCard rotulo="Maior fornecedor" valor={`${Math.round(topFrac * 100)}%`} sub="do total gasto" />
      </StatRow>

      <SecaoTitulo>Gasto mês a mês em {ANO}</SecaoTitulo>
      <MiniColunas
        dados={data.porMes.map((m) => ({ rotulo: MESES[m.mes - 1], valor: m.total }))}
        formata={brlCurto}
      />

      <SecaoTitulo>Maiores fornecedores</SecaoTitulo>
      <ul className="mt-2 flex flex-col gap-1">
        {data.fornecedores.map((f, i) => (
          <BarraLinha
            key={i}
            titulo={f.nome}
            sub={`${f.doc ?? "—"} · ${f.qtd} nota(s)`}
            valor={brl(f.total)}
            fracao={f.total / maxForn}
          />
        ))}
      </ul>
      <Fonte>Fonte: Câmara — CEAP (cota parlamentar). Período: ano de {ANO}.</Fonte>
    </>
  );
}

function ProjetosView({ data, pagina }: { data: ProjetosPagina; pagina: number }) {
  if (data.total === 0) return <Aviso>Sem projetos de autoria registrados.</Aviso>;
  const paginas = Math.ceil(data.total / 30);
  const anos = data.porAno.map((a) => a.ano);
  const periodo = anos.length ? `${Math.min(...anos)}–${Math.max(...anos)}` : "—";
  const taxaLei = data.total > 0 ? Math.round((data.virouLei / data.total) * 100) : 0;
  return (
    <>
      <StatRow>
        <StatCard rotulo="Projetos de autoria" valor={String(data.total)} />
        <StatCard rotulo="Viraram lei" valor={String(data.virouLei)} cor="var(--ds-ok-dark)" />
        <StatCard rotulo="Taxa que virou lei" valor={`${taxaLei}%`} />
        <StatCard rotulo="Período" valor={periodo} />
      </StatRow>

      <SecaoTitulo>Projetos por ano</SecaoTitulo>
      <MiniColunas
        dados={data.porAno.map((a) => ({ rotulo: String(a.ano), valor: a.total }))}
        formata={(v) => String(v)}
      />

      <SecaoTitulo>Projetos apresentados</SecaoTitulo>
      <ul className="mt-2 flex flex-col gap-3">
        {data.itens.map((p, i) => (
          <li key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--ds-hair)" }}>
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "var(--ds-muted)" }}>
                {p.tipo} · {p.ano}
              </span>
              {p.virouLei ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "var(--ds-ok-bg)", color: "var(--ds-ok-dark)" }}
                >
                  virou lei
                </span>
              ) : null}
            </span>
            <p className="mt-1 text-sm">{p.ementa}</p>
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
const VOTO_COR: Record<string, string> = {
  SIM: "var(--ds-ok-dark)", NAO: "var(--ds-alerta-dark)", AUSENTE: "var(--ds-muted)",
};

function VotacoesView({ data }: { data: VotacoesDetalhe }) {
  if (data.total === 0) return <Aviso>Sem votações nominais registradas no período.</Aviso>;
  const qtd = (v: string) => data.resumo.find((r) => r.voto === v)?.qtd ?? 0;
  const ausentes = qtd("AUSENTE");
  const presentes = data.total - ausentes;
  const taxa = data.total > 0 ? Math.round((presentes / data.total) * 100) : 0;
  return (
    <>
      <StatRow>
        <StatCard rotulo="Votações nominais" valor={String(data.total)} />
        <StatCard
          rotulo="Presença"
          valor={`${taxa}%`}
          cor={taxa >= 75 ? "var(--ds-ok-dark)" : "var(--ds-alerta-dark)"}
        />
        <StatCard rotulo="Votou Sim" valor={String(qtd("SIM"))} cor="var(--ds-ok-dark)" />
        <StatCard rotulo="Votou Não" valor={String(qtd("NAO"))} cor="var(--ds-alerta-dark)" />
      </StatRow>

      <p className="mt-4 text-sm" style={{ color: "var(--ds-muted)" }}>
        Apenas votações nominais (com voto individual registrado). A cobertura é parcial.
      </p>

      <SecaoTitulo>Votos mais recentes</SecaoTitulo>
      <ul className="mt-2 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {data.itens.map((v, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block truncate text-sm">{v.descricao}</span>
              <span className="text-xs" style={{ color: "var(--ds-muted)" }}>
                {dataBR(v.data)}
              </span>
            </span>
            <span className="whitespace-nowrap font-semibold" style={{ color: VOTO_COR[v.voto] ?? "var(--ds-ink)" }}>
              {VOTO_ROTULO[v.voto] ?? v.voto}
            </span>
          </li>
        ))}
      </ul>
      <Fonte>Fonte: Câmara — votações.</Fonte>
    </>
  );
}

function EmendasView({ data }: { data: EmendasDetalhe }) {
  if (data.beneficiarios.length === 0)
    return (
      <Aviso>
        Sem beneficiários rastreáveis. Muitas emendas vão a fundos/prefeituras, cujo fornecedor final
        não é público.
      </Aviso>
    );
  const anos = data.porAno.map((a) => a.ano);
  const periodo = anos.length ? `${Math.min(...anos)}–${Math.max(...anos)}` : "—";
  const maxBenef = data.beneficiarios[0].total || 1;
  return (
    <>
      <StatRow>
        <StatCard rotulo="Total pago" valor={brl(data.total)} />
        <StatCard rotulo="Beneficiários" valor={String(data.numBeneficiarios)} />
        <StatCard rotulo="Período" valor={periodo} />
        <StatCard rotulo="Anos com repasse" valor={String(data.porAno.length)} />
      </StatRow>

      <SecaoTitulo>Pagamentos por ano</SecaoTitulo>
      <MiniColunas
        dados={data.porAno.map((a) => ({ rotulo: String(a.ano), valor: a.total }))}
        formata={brlCurto}
      />

      <SecaoTitulo>Maiores beneficiários</SecaoTitulo>
      <ul className="mt-2 flex flex-col gap-1">
        {data.beneficiarios.map((b, i) => (
          <BarraLinha
            key={i}
            titulo={b.nome}
            sub={`${b.doc} · ${b.ano}`}
            valor={brl(b.total)}
            fracao={b.total / maxBenef}
          />
        ))}
      </ul>
      <Fonte>Fonte: Portal da Transparência — execução de emendas.</Fonte>
    </>
  );
}
