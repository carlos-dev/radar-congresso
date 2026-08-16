import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NivelBadge } from "@/components/NivelBadge";
import { NIVEL_CONFIG } from "@/lib/nivel";
import type { RedFlag } from "@/lib/tipos";

type Props = { rf: RedFlag };

export function RedFlagCard({ rf }: Props) {
  const config = NIVEL_CONFIG[rf.nivel];

  return (
    <Card className={cn("h-full border-l-4", config.acento)}>
      <CardHeader className="gap-2 pb-0">
        <NivelBadge nivel={rf.nivel} className="w-fit" />
        <h3 className="text-base font-semibold leading-snug">{rf.titulo}</h3>
      </CardHeader>
      <CardContent className="pt-3">
        <p className="text-pretty text-[15px] leading-relaxed">{rf.fraseSimples}</p>
      </CardContent>
      <CardFooter className="mt-auto border-t pt-3">
        <p className="text-xs text-muted-foreground">Fonte: {rf.fonte}</p>
      </CardFooter>
    </Card>
  );
}
