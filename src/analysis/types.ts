export type Nivel = "ok" | "atencao" | "alerta" | "sem_dado";

export interface RedFlag {
  id: string;
  titulo: string;
  nivel: Nivel;
  fraseSimples: string;
  fonte: string;
}
