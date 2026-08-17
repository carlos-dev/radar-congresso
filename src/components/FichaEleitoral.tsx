import { StatRow, StatCard, MiniColunas } from "@/components/detalhe";
import type { PerfilEleitoral } from "@/data/eleitoral";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCurto = (n: number) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mi`
    : n >= 1000
      ? `R$ ${Math.round(n / 1000)}k`
      : brl(n);

/** Ficha eleitoral (TSE): elegibilidade e evolução do patrimônio declarado. */
export function FichaEleitoral({ dados }: { dados: PerfilEleitoral }) {
  if (dados.candidaturas.length === 0) return null;
  const comPat = dados.candidaturas.filter((c) => c.patrimonio != null);
  const ultima = comPat[comPat.length - 1];
  const g = dados.crescimentoPct;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <h2 className="text-[20px] font-semibold">Ficha eleitoral</h2>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ backgroundColor: "var(--ds-hair)", color: "var(--ds-muted)" }}
        >
          TSE
        </span>
      </div>
      <p className="mt-1 max-w-[68ch] text-pretty text-[13px]" style={{ color: "var(--ds-muted)" }}>
        Elegibilidade e patrimônio declarado nas eleições. O patrimônio é <strong>autodeclarado</strong>{" "}
        pelo candidato ao TSE — variação não é, por si só, prova de irregularidade.
      </p>

      <StatRow>
        {ultima ? (
          <StatCard rotulo={`Patrimônio (${ultima.ano})`} valor={brl(ultima.patrimonio as number)} />
        ) : null}
        {g != null ? (
          <StatCard
            rotulo="Variação declarada"
            valor={`${g >= 0 ? "+" : ""}${g}%`}
            sub={`${comPat[0].ano}→${ultima.ano}`}
            cor={g >= 100 ? "var(--ds-atencao-dark)" : "var(--ds-ink)"}
          />
        ) : null}
        <StatCard
          rotulo="Elegibilidade"
          valor={dados.temInapto ? "Inapto" : "Apto"}
          cor={dados.temInapto ? "var(--ds-alerta-dark)" : "var(--ds-ok-dark)"}
          sub="situação no TSE"
        />
      </StatRow>

      {comPat.length >= 2 ? (
        <MiniColunas
          dados={comPat.map((c) => ({ rotulo: String(c.ano), valor: c.patrimonio as number }))}
          formata={brlCurto}
        />
      ) : null}

      <ul className="mt-4 divide-y" style={{ borderColor: "var(--ds-hair)" }}>
        {dados.candidaturas.map((c) => {
          const inapto = (c.situacao ?? "").toUpperCase() === "INAPTO";
          return (
            <li key={c.ano} className="flex items-center justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="text-sm font-medium">
                  {c.ano} · {c.cargo}
                </span>
                <span className="block text-xs" style={{ color: "var(--ds-muted)" }}>
                  {[c.resultado, c.patrimonio != null ? `patrimônio ${brl(c.patrimonio)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: inapto ? "var(--ds-alerta-bg)" : "var(--ds-ok-bg)",
                  color: inapto ? "var(--ds-alerta-dark)" : "var(--ds-ok-dark)",
                }}
              >
                {c.situacao || "—"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs" style={{ color: "var(--ds-muted)" }}>
        Fonte: TSE — candidaturas e bens de candidato declarados.
      </p>
    </section>
  );
}
