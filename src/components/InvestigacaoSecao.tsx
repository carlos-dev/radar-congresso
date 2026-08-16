import type { Conexao } from "@/analysis/conexoes";
import { ConexaoCard } from "@/components/ConexaoCard";

export function InvestigacaoSecao({ conexoes }: { conexoes: Conexao[] }) {
  return (
    <section aria-labelledby="investigacao" className="mt-8">
      <h2 id="investigacao" className="text-xl font-semibold tracking-tight">
        Investigação — doações × emendas
      </h2>
      <p
        className="mt-2 rounded-lg border p-3 text-[13px] leading-relaxed"
        style={{ borderColor: "var(--ds-atencao)", background: "var(--ds-atencao-bg)", color: "var(--ds-ink)" }}
      >
        <strong>Atenção:</strong> estes são <strong>possíveis vínculos</strong>, inferidos por
        correspondência aproximada de dados públicos (nomes e dígitos parciais de CPF). Podem conter
        homônimos ou erros e <strong>não comprovam irregularidade</strong>. Use como ponto de partida
        e confira sempre nas fontes oficiais.
      </p>
      {conexoes.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ds-muted)" }}>
          Nenhuma conexão encontrada nos dados públicos disponíveis.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conexoes.map((c, i) => (
            <li key={i}>
              <ConexaoCard c={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
