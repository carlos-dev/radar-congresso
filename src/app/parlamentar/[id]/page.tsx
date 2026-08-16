import { notFound } from "next/navigation";
import { obterPerfil } from "../../../data/parlamentares";
import { RedFlagCard } from "./RedFlagCard";

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await obterPerfil(id);
  if (!perfil) notFound();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <a href="/">← voltar</a>
      <h1>{perfil.nome}</h1>
      <p>{perfil.partido}/{perfil.uf} — {perfil.casa}</p>
      <h2>Ficha do parlamentar</h2>
      {perfil.ficha.redFlags.map((rf) => (
        <RedFlagCard key={rf.id} rf={rf} />
      ))}
      <p style={{ marginTop: 24, fontSize: 13, color: "#666", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        Estes são <strong>sinais para você investigar</strong>, com base em dados públicos oficiais — não são
        acusações. Vale sempre a <strong>presunção de inocência</strong>: um sinal de alerta indica um padrão que
        merece atenção, não a comprovação de irregularidade.
      </p>
    </main>
  );
}
