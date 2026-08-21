import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRICAO =
  "Como seus deputados e senadores votam, gastam a cota e destinam emendas — em linguagem simples e com a fonte oficial de cada dado. Escolha seu estado e veja como sua bancada votou nas pautas que importam.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Radar do Congresso — acompanhe deputados e senadores",
    template: "%s · Radar do Congresso",
  },
  description: DESCRICAO,
  applicationName: "Radar do Congresso",
  keywords: [
    "Câmara dos Deputados", "Senado Federal", "votações", "deputados federais",
    "senadores", "fiscalização", "transparência", "cota parlamentar", "CEAP",
    "emendas parlamentares", "como votou meu deputado", "dados públicos",
  ],
  authors: [{ name: "Carlos" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Radar do Congresso",
    url: SITE_URL,
    title: "Radar do Congresso — acompanhe deputados e senadores",
    description: DESCRICAO,
  },
  twitter: {
    card: "summary",
    title: "Radar do Congresso",
    description: DESCRICAO,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
