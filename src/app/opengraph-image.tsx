import { ImageResponse } from "next/og";

export const alt = "Radar do Congresso — acompanhe deputados e senadores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#15181e",
          color: "#ffffff",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* topo: marca radar + kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "999px",
              border: "3px solid #2dd2ad",
            }}
          >
            <div style={{ width: "14px", height: "14px", borderRadius: "999px", background: "#2dd2ad" }} />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              letterSpacing: "4px",
              color: "#2dd2ad",
              textTransform: "uppercase",
            }}
          >
            Fiscalização cidadã · dados públicos
          </div>
        </div>

        {/* título + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "82px", fontWeight: 700, lineHeight: 1.02 }}>
            Radar do Congresso
          </div>
          <div style={{ display: "flex", fontSize: "34px", color: "#ffffffc2", marginTop: "26px", maxWidth: "920px" }}>
            Como seus deputados e senadores votam, gastam a cota e destinam emendas — em linguagem simples.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "24px", color: "#2dd2ad" }}>radar-congresso.vercel.app</div>
      </div>
    ),
    { ...size },
  );
}
