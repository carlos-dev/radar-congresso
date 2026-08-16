import { listarParlamentares } from "@/lib/dados";
import { ParlamentarCard } from "@/components/ParlamentarCard";
import { SearchBar } from "@/components/SearchBar";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const { q } = await searchParams;
  const busca = q?.trim() ?? "";
  const parlamentares = await listarParlamentares(busca || undefined);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8">
      <h1 className="max-w-[16ch] text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Veja como seus deputados e senadores atuam
      </h1>
      <p className="mt-3 max-w-[52ch] text-pretty text-lg text-muted-foreground">
        Em linguagem simples, sem juridiquês. Buscamos os dados nas fontes oficiais e mostramos o
        que eles dizem — e de onde vieram.
      </p>

      <div className="mt-7">
        <SearchBar valorInicial={busca} />
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
        {busca
          ? `${parlamentares.length} ${parlamentares.length === 1 ? "parlamentar encontrado" : "parlamentares encontrados"} para “${busca}”`
          : `Mostrando ${parlamentares.length} parlamentares em exercício`}
      </p>

      {parlamentares.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parlamentares.map((p) => (
            <li key={p.id}>
              <ParlamentarCard p={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
          <p className="font-semibold">Nenhum parlamentar encontrado</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-pretty text-sm text-muted-foreground">
            Tente escrever o nome de outro jeito, ou busque pela sigla do partido (PT, PL, MDB…) ou
            pelo estado (SP, BA, RS…).
          </p>
        </div>
      )}
    </main>
  );
}
