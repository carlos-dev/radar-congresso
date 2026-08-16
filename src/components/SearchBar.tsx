import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  /** Valor atual da busca, para o campo não "esquecer" o termo após o GET. */
  valorInicial?: string;
};

/** Form GET puro: funciona sem JavaScript (a home é Server Component). */
export function SearchBar({ valorInicial = "" }: Props) {
  return (
    <form role="search" action="/" method="get" className="flex flex-wrap gap-2">
      <label htmlFor="q" className="sr-only">
        Buscar parlamentar pelo nome
      </label>
      <Input
        id="q"
        name="q"
        type="search"
        defaultValue={valorInicial}
        autoComplete="off"
        placeholder="Buscar por nome, partido ou estado"
        className="h-11 min-w-0 flex-1 basis-60"
      />
      <Button type="submit" className="h-11">
        Buscar
      </Button>
    </form>
  );
}
