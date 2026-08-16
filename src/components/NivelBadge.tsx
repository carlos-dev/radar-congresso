import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NIVEL_CONFIG } from "@/lib/nivel";
import type { Nivel } from "@/lib/tipos";

type Props = {
  nivel: Nivel;
  /** `geral` usa o rótulo mais longo, para o selo do perfil. */
  variante?: "curto" | "geral";
  className?: string;
};

export function NivelBadge({ nivel, variante = "curto", className }: Props) {
  const config = NIVEL_CONFIG[nivel];
  const texto = variante === "geral" ? config.rotuloGeral : config.rotulo;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border font-semibold", config.badge, className)}
    >
      <span className={cn("size-1.5 rounded-full", config.ponto)} aria-hidden="true" />
      {texto}
    </Badge>
  );
}
