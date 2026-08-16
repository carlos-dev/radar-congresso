import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { iniciais } from "@/lib/iniciais";
import type { ParlamentarResumo } from "@/lib/tipos";

type Props = { p: ParlamentarResumo };

export function ParlamentarCard({ p }: Props) {
  const partidoUf = [p.partido, p.uf].filter(Boolean).join(" · ") || "Sem partido informado";
  const casa = p.casa === "SENADO" ? "Senado" : "Câmara";

  return (
    <Card className="transition-colors hover:border-foreground/25 focus-within:ring-2 focus-within:ring-ring">
      <Link
        href={`/parlamentar/${p.id}`}
        className="flex items-center gap-4 p-4 outline-none"
        aria-label={`Ver ficha de ${p.nome}, ${partidoUf}, ${casa}`}
      >
        {p.urlFoto ? (
          <Image
            src={p.urlFoto}
            alt=""
            width={56}
            height={56}
            className="size-14 max-w-full shrink-0 rounded-full object-cover"
          />
        ) : (
          <Avatar className="size-14 shrink-0">
            <AvatarFallback className="text-base font-semibold">{iniciais(p.nome)}</AvatarFallback>
          </Avatar>
        )}

        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-semibold">{p.nome}</span>
          <span className="text-sm text-muted-foreground">{partidoUf}</span>
          <Badge variant="secondary" className="w-fit font-normal">
            {casa}
          </Badge>
        </span>
      </Link>
    </Card>
  );
}
