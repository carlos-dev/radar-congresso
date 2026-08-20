import type { ReactNode } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pautasQueImportam, votosPorUf, type Pauta, type VotoDoParlamentar } from "@/data/pautas";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ uf?: string }> };

// As 27 unidades da federação, na ordem alfabética por região tradicional dos dados oficiais.
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const CASA_ROTULO: Record<string, string> = { CAMARA: "Câmara", SENADO: "Senado" };

// Grupos de voto exibidos, na ordem, com rótulo e cor do design system.
const GRUPOS: { chave: string; rotulo: string; cor: string }[] = [
  { chave: "SIM", rotulo: "Votaram Sim", cor: "var(--ds-ok-dark)" },
  { chave: "NAO", rotulo: "Votaram Não", cor: "var(--ds-alerta-dark)" },
  { chave: "ABSTENCAO", rotulo: "Abstenção", cor: "var(--ds-atencao-dark)" },
  { chave: "OBSTRUCAO", rotulo: "Obstrução", cor: "var(--ds-atencao-dark)" },
];

export default async function ComoVotaramPage({ searchParams }: Props) {
  const { uf: ufBruto } = await searchParams;
  const uf = ufBruto?.toUpperCase();
  const ufValida = uf && (UFS as readonly string[]).includes(uf) ? uf : null;

  // Busca aqui (async) e passa a seções síncronas — assim a árvore renderizada
  // não tem componentes async (evita suspensão no SSR/testes).
  let corpo: ReactNode = <SeletorEstados />;
  if (ufValida) {
    const pautas = await pautasQueImportam();
    const votos = await votosPorUf(pautas.map((p) => p.id), ufValida);
    corpo = <VotosDoEstado uf={ufValida} pautas={pautas} votos={votos} />;
  }

  return (
    <>
      {/* Faixa escura: nav + hero */}
      <div style={{ backgroundColor: "var(--ds-ink)" }} className="text-[var(--ds-on-dark)]">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <TopNav />
          <header className="max-w-[46rem] pb-16 pt-12">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--ds-primary)" }}
            >
              Como votaram · Votações que importam
            </p>
            <h1 className="mt-5 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
              Como seus representantes votaram
            </h1>
            <p
              className="mt-5 max-w-[52ch] text-[17px] leading-relaxed"
              style={{ color: "var(--ds-on-dark-72)" }}
            >
              Escolha o seu estado e veja, votação por votação, o que cada deputado e senador da sua
              bancada decidiu — com o significado de cada Sim e cada Não em português claro.
            </p>
          </header>
        </div>
      </div>

      {corpo}

      <SiteFooter />
    </>
  );
}

function SeletorEstados() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-10">
      <h2
        className="text-[13px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--ds-muted)" }}
      >
        Escolha um estado
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
        {UFS.map((uf) => (
          <li key={uf}>
            <Link
              href={`?uf=${uf}`}
              className="flex items-center justify-center rounded-lg border py-4 text-[15px] font-semibold transition-colors hover:border-[color:var(--ds-primary)] hover:text-[color:var(--ds-primary-darker)]"
              style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)", color: "var(--ds-ink)" }}
            >
              {uf}
            </Link>
          </li>
        ))}
      </ul>
      <RodapeHonestidade />
      <p className="mt-6 text-sm">
        <Link href="/" style={{ color: "var(--ds-primary-darker)" }}>
          ← Voltar para a home
        </Link>
      </p>
    </main>
  );
}

function VotosDoEstado({
  uf,
  pautas,
  votos,
}: {
  uf: string;
  pautas: Pauta[];
  votos: Record<string, Record<string, VotoDoParlamentar[]>>;
}) {
  return (
    <main className="mx-auto w-full max-w-[900px] px-6 pb-16 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bancada de {uf}
        </h2>
        <Link href="/como-votaram" className="text-sm" style={{ color: "var(--ds-primary-darker)" }}>
          trocar de estado
        </Link>
      </div>
      <p className="mt-2 max-w-[65ch] text-[14px]" style={{ color: "var(--ds-muted)" }}>
        Mostra apenas quem votou — quem faltou ou não teve o voto registrado não aparece na votação.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {pautas.map((p) => (
          <PautaCard key={p.id} pauta={p} votos={votos[p.id] ?? {}} />
        ))}
      </ul>

      <RodapeHonestidade />
      <p className="mt-6 text-sm">
        <Link href="/" style={{ color: "var(--ds-primary-darker)" }}>
          ← Voltar para a home
        </Link>
      </p>
    </main>
  );
}

function PautaCard({
  pauta,
  votos,
}: {
  pauta: Pauta;
  votos: Record<string, VotoDoParlamentar[]>;
}) {
  return (
    <li
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
    >
      <div
        className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "var(--ds-muted)" }}
      >
        <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: "var(--ds-hair)" }}>
          {CASA_ROTULO[pauta.casa] ?? pauta.casa}
        </span>
        {pauta.revisada ? (
          <span
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: "var(--ds-ok-bg)", color: "var(--ds-ok-dark)" }}
          >
            revisado
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 text-pretty text-[17px] font-semibold leading-snug" style={{ color: "var(--ds-ink)" }}>
        {pauta.titulo}
      </h3>

      {pauta.resumoCidadao ? (
        <p className="mt-2 max-w-[65ch] text-[14px] leading-relaxed" style={{ color: "var(--ds-emphasis)" }}>
          {pauta.resumoCidadao}
        </p>
      ) : null}

      {pauta.significadoSim || pauta.significadoNao ? (
        <dl className="mt-3 flex flex-col gap-1.5 text-[13px]">
          {pauta.significadoSim ? (
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold" style={{ color: "var(--ds-ok-dark)" }}>
                Votar Sim significou:
              </dt>
              <dd style={{ color: "var(--ds-emphasis)" }}>{pauta.significadoSim}</dd>
            </div>
          ) : null}
          {pauta.significadoNao ? (
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold" style={{ color: "var(--ds-alerta-dark)" }}>
                Votar Não significou:
              </dt>
              <dd style={{ color: "var(--ds-emphasis)" }}>{pauta.significadoNao}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {pauta.secreta ? (
        <p
          className="mt-4 rounded-lg border px-3 py-2.5 text-[13px]"
          style={{ backgroundColor: "var(--ds-atencao-bg)", borderColor: "var(--ds-hair)", color: "var(--ds-atencao-dark)" }}
        >
          🔒 Voto sigiloso — o Senado não divulga o voto individual nesta votação.
        </p>
      ) : (
        <GruposDeVoto votos={votos} />
      )}
    </li>
  );
}

function GruposDeVoto({ votos }: { votos: Record<string, VotoDoParlamentar[]> }) {
  const grupos = GRUPOS.map((g) => ({ ...g, lista: votos[g.chave] ?? [] })).filter(
    (g) => g.lista.length > 0,
  );

  if (grupos.length === 0) {
    return (
      <p className="mt-4 text-[13px]" style={{ color: "var(--ds-muted)" }}>
        Nenhum parlamentar deste estado teve o voto registrado nesta votação.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {grupos.map((g) => (
        <div key={g.chave}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: g.cor }}>
            {g.rotulo} · {g.lista.length}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {g.lista.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/parlamentar/${v.id}`}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] transition-colors hover:border-[color:var(--ds-primary)]"
                  style={{ borderColor: "var(--ds-hair)", color: "var(--ds-ink)" }}
                >
                  <span className="font-medium">{v.nome}</span>
                  {v.partido ? (
                    <span style={{ color: "var(--ds-muted)" }}>{v.partido}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RodapeHonestidade(): ReactNode {
  return (
    <p className="mt-10 max-w-[70ch] text-[12px] leading-relaxed" style={{ color: "var(--ds-muted)" }}>
      O Senado tem votações secretas (mostradas como sigilosas) e vota menos que a Câmara. As
      explicações em linguagem simples das votações não-marcantes são geradas automaticamente.
    </p>
  );
}
