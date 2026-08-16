/** Enquadramento ético (faixa escura, duas colunas). */
export function AvisoEtico() {
  return (
    <section
      className="rounded-xl p-8 text-[var(--ds-on-dark)] md:flex md:gap-8"
      style={{ backgroundColor: "var(--ds-ink)" }}
      aria-labelledby="aviso-titulo"
    >
      <div className="md:basis-2/5">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--ds-primary)" }}
        >
          Como ler esta ficha
        </p>
        <h2 id="aviso-titulo" className="mt-3 text-[26px] font-semibold leading-tight">
          Sinais para investigar — não são acusações.
        </h2>
      </div>

      <div
        className="mt-6 space-y-4 border-t pt-6 md:mt-0 md:basis-3/5 md:border-l md:border-t-0 md:pl-8 md:pt-0"
        style={{ borderColor: "var(--ds-on-dark-8)" }}
      >
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--ds-on-dark-72)" }}>
          Tudo aqui vem de bases públicas oficiais e pode conter erro ou estar desatualizado. Um
          sinal de alerta significa apenas que vale a pena olhar mais de perto — <strong>não</strong>{" "}
          que houve irregularidade.
        </p>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--ds-on-dark-72)" }}>
          Toda pessoa é inocente até que a Justiça decida em definitivo. Antes de tirar conclusões,
          confira a fonte indicada em cada card e procure o posicionamento do parlamentar.
        </p>
      </div>
    </section>
  );
}
