import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiltroChips } from "@/components/FiltroChips";
import type { FiltroRadar } from "@/lib/dados";

type Props = {
  /** Valor atual da busca, para o campo não "esquecer" o termo após o GET. */
  valorInicial?: string;
  /** Filtro ativo, preservado no submit e destacado nos chips. */
  filtro?: FiltroRadar;
};

/**
 * Bloco de busca elevado (sobrepõe a faixa escura). Form GET puro — funciona
 * sem JavaScript, pois a home é Server Component.
 */
export function SearchBar({ valorInicial = "", filtro = "todos" }: Props) {
  return (
    <div
      className="rounded-xl border p-[22px]"
      style={{
        backgroundColor: "var(--ds-card)",
        borderColor: "var(--ds-hair)",
        boxShadow: "0 18px 40px -24px rgba(0,0,0,.35)",
      }}
    >
      <form role="search" action="/" method="get" className="flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar parlamentar por nome, partido ou estado
        </label>
        {filtro !== "todos" ? <input type="hidden" name="filtro" value={filtro} /> : null}
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={valorInicial}
          autoComplete="off"
          placeholder="Nome, partido ou estado — ex.: Célia, PVB, SP"
          className="h-11 min-w-0 flex-1 basis-60"
        />
        <Button type="submit" className="h-11 px-6">
          Buscar
        </Button>
      </form>

      <div className="mt-4">
        <FiltroChips filtro={filtro} q={valorInicial || undefined} />
      </div>
    </div>
  );
}
