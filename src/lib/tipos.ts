export type Casa = "CAMARA" | "SENADO";

export type ParlamentarResumo = {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: Casa;
  urlFoto: string | null;
};

export type Nivel = "ok" | "atencao" | "alerta" | "sem_dado";

export type RedFlag = {
  id: string;
  titulo: string;
  nivel: Nivel;
  fraseSimples: string;
  fonte: string;
};

export type Ficha = {
  nivelGeral: Nivel;
  /** Sempre 4 sinais. */
  redFlags: RedFlag[];
};

export type Perfil = ParlamentarResumo & { ficha: Ficha };
