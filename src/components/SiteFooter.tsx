import { RadarLogo } from "@/components/RadarLogo";

/** Rodapé escuro: aviso + wordmark. */
export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: "var(--ds-ink)" }} className="text-[var(--ds-on-dark)]">
      <div className="mx-auto w-full max-w-[1080px] px-6 py-10 md:flex md:items-center md:justify-between md:gap-6">
        <p className="max-w-[60ch] text-[13px] leading-relaxed" style={{ color: "var(--ds-on-dark-72)" }}>
          Radar do Congresso reúne dados públicos oficiais da Câmara dos Deputados, do Senado Federal
          e do Portal da Transparência. As informações podem conter erros ou estar desatualizadas —
          confira sempre a fonte de cada sinal.
        </p>
        <div className="mt-6 flex items-center gap-2.5 md:mt-0">
          <RadarLogo />
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Radar do Congresso
          </span>
        </div>
      </div>
    </footer>
  );
}
