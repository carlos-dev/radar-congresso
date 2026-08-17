import Link from "next/link";
import Image from "next/image";
import { obterRankings, type Ranking, type ItemRanking } from "@/data/rankings";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { iniciais } from "@/lib/iniciais";

export const metadata = {
  title: "Rankings — Radar do Congresso",
};

// Dados vêm do banco (atualizados por ingestão) — renderiza a cada request
// para não congelar o ranking no momento do build.
export const dynamic = "force-dynamic";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formata = (unidade: Ranking["unidade"], v: number) =>
  unidade === "brl" ? brl(v) : unidade === "pct" ? `${Math.round(v * 100)}%` : v.toLocaleString("pt-BR");

// Ouro/prata/bronze para o pódio; demais em cinza.
const CORES_POSICAO = ["#caa53d", "#8b9099", "#b07a49"];

export default async function RankingsPage() {
  const rankings = await obterRankings();

  return (
    <>
      <div style={{ backgroundColor: "var(--ds-ink)" }} className="text-[var(--ds-on-dark)]">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <TopNav />
          <header className="pb-16 pt-10">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--ds-primary)" }}
            >
              Rankings
            </p>
            <h1 className="mt-4 max-w-[18ch] text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
              Os extremos do Congresso, em números.
            </h1>
            <p
              className="mt-4 max-w-[52ch] text-[16px] leading-relaxed"
              style={{ color: "var(--ds-on-dark-72)" }}
            >
              Quem lidera cada métrica pública. Estar no topo não é acusação — é ponto de partida
              para investigar. Cada lista traz a fonte oficial.
            </p>
          </header>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {rankings.map((r) => (
            <RankingCard key={r.chave} ranking={r} />
          ))}
        </div>

        <p className="mt-10 max-w-[70ch] text-[13px]" style={{ color: "var(--ds-muted)" }}>
          Cota, projetos e faltas cobrem a Câmara; emendas cobrem as duas casas. Como não temos dados
          de licença/posse, o ranking de faltas considera só titulares presentes em pelo menos 70%
          das votações de plenário — assim um ministro licenciado ou suplente não aparece como
          “faltoso”.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

function RankingCard({ ranking }: { ranking: Ranking }) {
  const max = ranking.itens[0]?.valor || 1;
  return (
    <section
      className="flex flex-col rounded-xl border"
      style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
    >
      <header className="border-b px-5 py-4" style={{ borderColor: "var(--ds-hair)" }}>
        <h2 className="text-[17px] font-semibold leading-tight">{ranking.titulo}</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--ds-muted)" }}>
          {ranking.subtitulo}
        </p>
      </header>
      <ol className="flex flex-col">
        {ranking.itens.map((item) => (
          <LinhaRanking key={item.id} item={item} unidade={ranking.unidade} fracao={item.valor / max} />
        ))}
      </ol>
      <footer className="mt-auto px-5 py-3">
        <p className="text-[11px]" style={{ color: "var(--ds-muted)" }}>
          Fonte: {ranking.fonte}
        </p>
      </footer>
    </section>
  );
}

function LinhaRanking({
  item,
  unidade,
  fracao,
}: {
  item: ItemRanking;
  unidade: Ranking["unidade"];
  fracao: number;
}) {
  const partidoUf = [item.partido, item.uf].filter(Boolean).join("-") || "—";
  const corPos = CORES_POSICAO[item.posicao - 1];
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--ds-hair)" }}>
      <Link
        href={`/parlamentar/${item.id}`}
        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[color:var(--ds-hair)]"
      >
        <span
          className="w-6 shrink-0 text-center text-[15px] font-bold tabular-nums"
          style={{ color: corPos ?? "var(--ds-subtle)" }}
        >
          {item.posicao}
        </span>
        {item.urlFoto ? (
          <Image
            src={item.urlFoto}
            alt=""
            width={38}
            height={38}
            className="size-[38px] shrink-0 rounded-md border object-cover"
            style={{ borderColor: "var(--ds-hair)" }}
          />
        ) : (
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold"
            style={{ borderColor: "var(--ds-hair)", color: "var(--ds-emphasis)" }}
          >
            {iniciais(item.nome)}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[14px] font-semibold">{item.nome}</span>
          <span className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--ds-hair)" }}>
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.max(3, fracao * 100)}%`, backgroundColor: "var(--ds-primary)" }}
            />
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[14px] font-semibold tabular-nums">{formata(unidade, item.valor)}</span>
          <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--ds-muted)" }}>
            {partidoUf}
          </span>
        </span>
      </Link>
    </li>
  );
}
