import Link from "next/link";
import { listarComRadar, type FiltroRadar } from "@/lib/dados";
import { TopNav } from "@/components/TopNav";
import { SearchBar } from "@/components/SearchBar";
import { Legenda } from "@/components/Legenda";
import { ParlamentarRow } from "@/components/ParlamentarRow";
import { SiteFooter } from "@/components/SiteFooter";

type Props = { searchParams: Promise<{ q?: string; filtro?: string }> };

const FILTROS: FiltroRadar[] = ["todos", "camara", "senado", "alerta"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloAtualizacao(): string {
  const d = new Date();
  return `Atualizado em ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

const STATS = [
  { dt: "Câmara", dd: "513" },
  { dt: "Senado", dd: "81" },
  { dt: "Sinais", dd: "4" },
];

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const busca = sp.q?.trim() ?? "";
  const filtro: FiltroRadar = FILTROS.includes(sp.filtro as FiltroRadar)
    ? (sp.filtro as FiltroRadar)
    : "todos";

  const parlamentares = await listarComRadar({ busca: busca || undefined, filtro });
  const n = parlamentares.length;
  const temFiltroAtivo = Boolean(busca) || filtro !== "todos";

  return (
    <>
      {/* Faixa escura: nav + hero */}
      <div style={{ backgroundColor: "var(--ds-ink)" }} className="text-[var(--ds-on-dark)]">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <TopNav updatedLabel={rotuloAtualizacao()} />

          <header className="flex flex-wrap items-start justify-between gap-x-12 gap-y-10 pb-24 pt-14">
            <div className="min-w-0 flex-1 basis-[28rem]">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--ds-primary)" }}
              >
                Fiscalização cidadã · Dados públicos oficiais
              </p>
              <h1 className="mt-5 max-w-[14ch] text-balance text-[38px] font-semibold leading-[1.03] tracking-[-0.035em] sm:text-[46px] lg:text-[54px]">
                Seus deputados e senadores, sob o radar.
              </h1>
              <p
                className="mt-5 max-w-[46ch] text-[17px] leading-relaxed"
                style={{ color: "var(--ds-on-dark-72)" }}
              >
                Quatro sinais por parlamentar, explicados em português claro — sem juridiquês, sem
                adjetivo, com a fonte oficial de cada informação.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-x-8 gap-y-2">
              {STATS.map((s) => (
                <div key={s.dt} className="flex flex-col gap-1">
                  <dt
                    className="text-[10px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--ds-on-dark-48)" }}
                  >
                    {s.dt}
                  </dt>
                  <dd className="text-[26px] font-semibold leading-none">{s.dd}</dd>
                </div>
              ))}
            </dl>
          </header>
        </div>
      </div>

      {/* Bloco de busca sobrepondo a faixa */}
      <div className="mx-auto -mt-11 w-full max-w-[1080px] px-6">
        <SearchBar valorInicial={busca} filtro={filtro} />
      </div>

      <main className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-10">
        <Legenda />

        <p aria-live="polite" className="mt-6 text-[14px]" style={{ color: "var(--ds-muted)" }}>
          {busca
            ? `${n} ${n === 1 ? "parlamentar encontrado" : "parlamentares encontrados"} para “${busca}”`
            : `${n} parlamentares · 4 sinais cada`}
        </p>

        {n > 0 ? (
          <ul
            className="mt-3 overflow-hidden rounded-xl border"
            style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
          >
            {parlamentares.map((p) => (
              <li key={p.id}>
                <ParlamentarRow p={p} />
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="mt-3 rounded-xl border p-12 text-center"
            style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
          >
            <p className="text-[17px] font-semibold">Nada no radar para essa busca</p>
            <p
              className="mx-auto mt-2 max-w-[46ch] text-pretty text-[14px]"
              style={{ color: "var(--ds-muted)" }}
            >
              Tente escrever o nome de outro jeito, ou busque pela sigla do partido (PT, PL, MDB…) ou
              pelo estado (SP, BA, RS…).
            </p>
            {temFiltroAtivo ? (
              <Link
                href="/"
                className="mt-4 inline-block text-[14px] font-semibold underline underline-offset-4"
                style={{ color: "var(--ds-primary-darker)" }}
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
