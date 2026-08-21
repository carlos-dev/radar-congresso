import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { RadarBars } from "@/components/RadarBars";
import { RedFlagCard } from "@/components/RedFlagCard";
import { AvisoEtico } from "@/components/AvisoEtico";
import { InvestigacaoSecao } from "@/components/InvestigacaoSecao";
import { FichaEleitoral } from "@/components/FichaEleitoral";
import { SiteFooter } from "@/components/SiteFooter";
import { NIVEL_CONFIG } from "@/lib/nivel";
import { iniciais } from "@/lib/iniciais";
import { obterPerfil } from "@/lib/dados";
import { slugParlamentar } from "@/lib/slug";
import { obterConexoes, obterConexoesCota } from "@/data/investigacao";
import { perfilEleitoral } from "@/data/eleitoral";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const perfil = await obterPerfil(id);
  if (!perfil) return { title: "Parlamentar não encontrado" };
  const partidoUf = [perfil.partido, perfil.uf].filter(Boolean).join("-");
  const casa = perfil.casa === "SENADO" ? "Senador(a)" : "Deputado(a) Federal";
  return {
    title: perfil.nome,
    description: `${perfil.nome} — ${casa} ${partidoUf}. Presença nas votações, uso da cota, emendas e produção legislativa, em dados públicos oficiais.`,
  };
}

export default async function PerfilPage({ params }: Props) {
  const { id } = await params;
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();

  // Estas funções usam o id interno (cuid), não o slug da URL.
  const [conexoesEmenda, conexoesCota, eleitoral] = await Promise.all([
    obterConexoes(perfil.id),
    obterConexoesCota(perfil.id),
    perfilEleitoral(perfil.id),
  ]);
  const conexoes = [...conexoesEmenda, ...conexoesCota];

  const partidoUf = [perfil.partido, perfil.uf].filter(Boolean).join("-") || "Sem partido";
  const casaLonga = perfil.casa === "SENADO" ? "Senado Federal" : "Câmara dos Deputados";
  const geral = NIVEL_CONFIG[perfil.ficha.nivelGeral];

  return (
    <>
      {/* Faixa escura: nav + cabeçalho do perfil */}
      <div style={{ backgroundColor: "var(--ds-ink)" }} className="text-[var(--ds-on-dark)]">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <TopNav />

          <Link
            href="/"
            className="mt-6 inline-block text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--ds-on-dark-72)" }}
          >
            ← Voltar para a busca
          </Link>

          <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-8 pb-24 pt-6">
            <div className="flex min-w-0 flex-1 basis-[24rem] items-start gap-5">
              {perfil.urlFoto ? (
                <Image
                  src={perfil.urlFoto}
                  alt=""
                  width={72}
                  height={72}
                  className="size-[72px] shrink-0 rounded-lg border object-cover"
                  style={{ borderColor: "var(--ds-on-dark-24)" }}
                />
              ) : (
                <span
                  className="flex size-[72px] shrink-0 items-center justify-center rounded-lg border text-[22px] font-semibold"
                  style={{ borderColor: "var(--ds-on-dark-24)" }}
                >
                  {iniciais(perfil.nome)}
                </span>
              )}
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--ds-primary)" }}
                >
                  {casaLonga}
                </p>
                <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-[44px]">
                  {perfil.nome}
                </h1>
                <p
                  className="mt-2 text-[14px] uppercase tracking-[0.06em]"
                  style={{ color: "var(--ds-on-dark-48)" }}
                >
                  {partidoUf} · Mandato 2023–2027
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3">
              <p
                className="text-[10px] uppercase tracking-[0.1em]"
                style={{ color: "var(--ds-on-dark-48)" }}
              >
                Leitura geral do radar
              </p>
              <RadarBars redFlags={perfil.ficha.redFlags} variante="perfil" />
              <p className="text-[20px] font-semibold" style={{ color: geral.cor }}>
                {geral.rotuloGeral}
              </p>
            </div>
          </header>
        </div>
      </div>

      {/* Ficha sobrepondo a faixa */}
      <div className="mx-auto -mt-[30px] w-full max-w-[1080px] px-6">
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--ds-card)",
            borderColor: "var(--ds-hair)",
            boxShadow: "0 18px 40px -24px rgba(0,0,0,.35)",
          }}
        >
          <h2 className="text-[22px] font-semibold">Ficha do parlamentar</h2>
          <p className="mt-1 max-w-[64ch] text-pretty text-[14px]" style={{ color: "var(--ds-muted)" }}>
            Quatro sinais acompanhados em dados públicos oficiais. Cada card traz a fonte de onde a
            informação foi tirada.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-6">
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
          {perfil.ficha.redFlags.map((rf, i) => (
            <li key={rf.id} className="flex">
              <RedFlagCard rf={rf} numero={i + 1} idParlamentar={slugParlamentar(perfil.nome, perfil.externalId)} />
            </li>
          ))}
        </ol>

        <InvestigacaoSecao conexoes={conexoes} />

        <FichaEleitoral dados={eleitoral} />

        <div className="mt-8">
          <AvisoEtico />
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-[14px] font-semibold underline underline-offset-4"
          style={{ color: "var(--ds-primary-darker)" }}
        >
          ← Ver outros parlamentares
        </Link>
      </main>

      <SiteFooter />
    </>
  );
}
