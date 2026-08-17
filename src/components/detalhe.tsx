import type { ReactNode } from "react";

/** Faixa de KPIs no topo da tela de detalhe. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  );
}

/** Cartão de número grande (KPI). `cor` opcional pinta o valor. */
export function StatCard({
  rotulo,
  valor,
  sub,
  cor,
}: {
  rotulo: string;
  valor: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--ds-muted)" }}>
        {rotulo}
      </p>
      <p className="mt-1 text-[26px] font-semibold leading-none" style={{ color: cor ?? "var(--ds-ink)" }}>
        {valor}
      </p>
      {sub ? (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--ds-muted)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Gráfico de colunas simples (CSS puro, sem lib). Cada barra tem altura
 * proporcional ao maior valor. `destaque` marca a coluna de maior valor.
 */
export function MiniColunas({
  dados,
  formata,
}: {
  dados: { rotulo: string; valor: number }[];
  formata: (v: number) => string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const idxMax = dados.reduce((mi, d, i, a) => (d.valor > a[mi].valor ? i : mi), 0);
  return (
    <div
      className="mt-4 rounded-lg border p-4"
      style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)" }}
    >
      <div className="flex h-36 items-end gap-1.5">
        {dados.map((d, i) => {
          const alt = (d.valor / max) * 100;
          const destaque = i === idxMax && d.valor > 0;
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold" style={{ color: "var(--ds-emphasis)" }}>
                {d.valor > 0 && destaque ? formata(d.valor) : ""}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${alt}%`,
                  minHeight: d.valor > 0 ? 4 : 0,
                  backgroundColor: destaque ? "var(--ds-primary-dark)" : "var(--ds-primary)",
                }}
                title={`${d.rotulo}: ${formata(d.valor)}`}
              />
              <span className="truncate text-[10px]" style={{ color: "var(--ds-muted)" }}>
                {d.rotulo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Linha de lista com barra de proporção ao fundo (relativa ao maior valor).
 * Mostra título, subtítulo e valor à direita.
 */
export function BarraLinha({
  titulo,
  sub,
  valor,
  fracao,
}: {
  titulo: string;
  sub?: ReactNode;
  valor: string;
  fracao: number;
}) {
  return (
    <li className="relative overflow-hidden rounded-md">
      <div
        className="absolute inset-y-0 left-0 rounded-md"
        style={{ width: `${Math.max(2, fracao * 100)}%`, backgroundColor: "var(--ds-primary-light)" }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-4 px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate font-medium" style={{ color: "var(--ds-ink)" }}>
            {titulo}
          </span>
          {sub ? (
            <span className="text-xs" style={{ color: "var(--ds-muted)" }}>
              {sub}
            </span>
          ) : null}
        </span>
        <span className="whitespace-nowrap font-semibold" style={{ color: "var(--ds-ink)" }}>
          {valor}
        </span>
      </div>
    </li>
  );
}
