import Link from "next/link";
import { listarParlamentares } from "../data/parlamentares";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const lista = await listarParlamentares(q);
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Radar do Congresso</h1>
      <p>Veja como seus deputados e senadores atuam — em linguagem simples.</p>
      <form>
        <input name="q" defaultValue={q ?? ""} placeholder="Buscar por nome..." style={{ padding: 8, width: "100%" }} />
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {lista.map((p) => (
          <li key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
            <Link href={`/parlamentar/${p.id}`}>
              <strong>{p.nome}</strong> — {p.partido}/{p.uf} ({p.casa})
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
