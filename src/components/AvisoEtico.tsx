import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AvisoEtico() {
  return (
    <Alert>
      <Info className="size-5" aria-hidden="true" />
      <AlertTitle>Sinais para investigar — não são acusações</AlertTitle>
      <AlertDescription className="text-pretty leading-relaxed">
        Tudo aqui vem de bases públicas oficiais e pode conter erros ou estar desatualizado. Um
        sinal de alerta significa apenas que vale a pena olhar mais de perto — <strong>não</strong>{" "}
        que houve irregularidade. Toda pessoa é inocente até que a Justiça decida em definitivo.
        Antes de tirar conclusões, confira a fonte indicada em cada card e procure o posicionamento
        do parlamentar.
      </AlertDescription>
    </Alert>
  );
}
