import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NivelBadge } from "@/components/NivelBadge";
import { RedFlagCard } from "@/components/RedFlagCard";
import { AvisoEtico } from "@/components/AvisoEtico";
import { iniciais } from "@/lib/iniciais";
import { obterPerfil } from "@/lib/dados";

type Props = { params: Promise<{ id: string }> };

export default async function PerfilPage({ params }: Props) {
  const { id } = await params;
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();

  const partidoUf = [perfil.partido, perfil.uf].filter(Boolean).join(" · ") || "Sem partido informado";
  const casa = perfil.casa === "SENADO" ? "Senado Federal" : "Câmara dos Deputados";

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 py-2 text-sm underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para a busca
      </Link>

      <section
        aria-labelledby="nome-parlamentar"
        className="mt-3 flex flex-wrap items-start gap-5 rounded-xl border bg-card p-5"
      >
        {perfil.urlFoto ? (
          <Image
            src={perfil.urlFoto}
            alt=""
            width={80}
            height={80}
            className="size-20 max-w-full shrink-0 rounded-full object-cover"
          />
        ) : (
          <Avatar className="size-20 shrink-0">
            <AvatarFallback className="text-2xl font-semibold">
              {iniciais(perfil.nome)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
          <h1 id="nome-parlamentar" className="text-2xl font-semibold tracking-tight">
            {perfil.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {partidoUf} · {casa}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <NivelBadge nivel={perfil.ficha.nivelGeral} variante="geral" />
            <Badge variant="secondary" className="font-normal">
              {perfil.casa === "SENADO" ? "Senado" : "Câmara"}
            </Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="ficha" className="mt-8">
        <h2 id="ficha" className="text-xl font-semibold tracking-tight">
          Ficha do parlamentar
        </h2>
        <p className="mt-1 max-w-[56ch] text-pretty text-sm text-muted-foreground">
          Quatro pontos que acompanhamos em dados públicos. Cada um traz a fonte de onde a
          informação foi tirada.
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {perfil.ficha.redFlags.map((rf) => (
            <li key={rf.id} className="flex">
              <RedFlagCard rf={rf} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-7">
        <AvisoEtico />
      </div>
    </main>
  );
}
