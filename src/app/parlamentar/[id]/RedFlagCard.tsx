import type { RedFlag } from "../../../analysis/types";

const CORES: Record<RedFlag["nivel"], string> = {
  ok: "#1a7f37",
  atencao: "#b58900",
  alerta: "#b00020",
  sem_dado: "#666",
};

const ROTULO: Record<RedFlag["nivel"], string> = {
  ok: "Tudo certo",
  atencao: "Atenção",
  alerta: "Sinal de alerta",
  sem_dado: "Sem dados",
};

export function RedFlagCard({ rf }: { rf: RedFlag }) {
  return (
    <div style={{ border: `1px solid ${CORES[rf.nivel]}`, borderRadius: 8, padding: 16, margin: "12px 0" }}>
      <div style={{ color: CORES[rf.nivel], fontWeight: 700 }}>
        {ROTULO[rf.nivel]} · {rf.titulo}
      </div>
      <p>{rf.fraseSimples}</p>
      <small style={{ color: "#666" }}>Fonte: {rf.fonte}</small>
    </div>
  );
}
