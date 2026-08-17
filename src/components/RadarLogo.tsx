/** Logo animado: círculo com uma varredura de radar (conic-gradient girando). */
export function RadarLogo() {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full border"
      style={{ borderColor: "var(--ds-on-dark-24)" }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--ds-primary) 70deg, transparent 140deg)",
          animation: "varredura 4s linear infinite",
        }}
      />
      <span
        className="relative size-1 rounded-full"
        style={{ backgroundColor: "var(--ds-primary)" }}
      />
    </span>
  );
}
