import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NivelBadge } from "@/components/NivelBadge";
import { cn } from "@/lib/utils";
import type { RedFlag } from "@/analysis/types";

const ACCENT_BORDA: Record<RedFlag["nivel"], string> = {
  ok: "border-l-nivel-ok",
  atencao: "border-l-nivel-atencao",
  alerta: "border-l-nivel-alerta",
  sem_dado: "border-l-nivel-sem-dado",
};

export function RedFlagCard({ rf }: { rf: RedFlag }) {
  return (
    <Card className={cn("border-l-4", ACCENT_BORDA[rf.nivel])}>
      <CardHeader>
        <NivelBadge nivel={rf.nivel} className="mb-1 w-fit" />
        <CardTitle>{rf.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p>{rf.fraseSimples}</p>
        <p className="text-xs text-muted-foreground">Fonte: {rf.fonte}</p>
      </CardContent>
    </Card>
  );
}
