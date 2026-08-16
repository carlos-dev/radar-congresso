import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Nivel } from "@/analysis/types";

export const NIVEL_CONFIG: Record<Nivel, { rotulo: string; className: string }> = {
  ok: {
    rotulo: "Tudo certo",
    className: "border-nivel-ok/30 bg-nivel-ok/10 text-nivel-ok",
  },
  atencao: {
    rotulo: "Atenção",
    className: "border-nivel-atencao/30 bg-nivel-atencao/10 text-nivel-atencao",
  },
  alerta: {
    rotulo: "Sinal de alerta",
    className: "border-nivel-alerta/30 bg-nivel-alerta/10 text-nivel-alerta",
  },
  sem_dado: {
    rotulo: "Sem dados",
    className: "border-nivel-sem-dado/30 bg-nivel-sem-dado/10 text-nivel-sem-dado",
  },
};

export function NivelBadge({
  nivel,
  className,
}: {
  nivel: Nivel;
  className?: string;
}) {
  const config = NIVEL_CONFIG[nivel];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.rotulo}
    </Badge>
  );
}
