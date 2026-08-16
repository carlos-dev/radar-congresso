import type { Conexao, Confianca } from "@/analysis/conexoes";

const CONF_ROTULO: Record<Confianca, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const CONF_COR: Record<Confianca, string> = {
  alta: "var(--ds-alerta)", media: "var(--ds-atencao)", baixa: "var(--ds-muted)",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ConexaoCard({ c }: { c: Conexao }) {
  return (
    <article className="rounded-lg border p-4" style={{ borderColor: "var(--ds-hair)", backgroundColor: "var(--ds-card)" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ds-muted)" }}>
          {c.tipo === "SOCIO" ? "Doador é sócio de beneficiária" : "Doador foi beneficiário"}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: CONF_COR[c.confianca], border: `1px solid ${CONF_COR[c.confianca]}` }}
        >
          Confiança {CONF_ROTULO[c.confianca]}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed">
        <strong>{c.doadorNome}</strong> doou {brl(c.valorDoacao)} para a campanha
        {c.empresaNome ? <> e é sócio da <strong>{c.empresaNome}</strong></> : null}, que recebeu{" "}
        {brl(c.valorEmenda)} de emenda em {c.ano}.
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--ds-muted)" }}>
        Trata-se de um possível vínculo — confira nas fontes oficiais (TSE e Portal da Transparência).
      </p>
    </article>
  );
}
