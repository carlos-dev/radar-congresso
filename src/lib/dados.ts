// Ponte entre a UI (gerada pelo Claude Design, que importa de "@/lib/dados")
// e a camada de acesso a dados real do projeto.
export { listarParlamentares, obterPerfil } from "@/data/parlamentares";
export type { ParlamentarResumo, Perfil } from "@/data/parlamentares";
