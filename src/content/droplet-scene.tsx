import type { MascotState } from "./mascot-state";

function getMascotSrc(baseUrl: string, state: MascotState): string {
  switch (state) {
    case "new_prompt":
    case "reset":
      return `${baseUrl}/mascot_5.png`; // cheering
    case "streaming_output":
      return `${baseUrl}/mascot_6.png`; // happy
    case "updated":
      return `${baseUrl}/mascot_3.png`; // smiling/winking
    case "long_or_heavy":
      return `${baseUrl}/mascot_2.png`; // sad/thinking
    case "uncertain":
    case "error":
      return `${baseUrl}/mascot_4.png`; // confused
    case "baseline":
    case "idle":
    default:
      return `${baseUrl}/mascot_1.png`; // waving
  }
}

export function DropletScene({ state }: { state: MascotState }) {
  const baseUrl = "https://web-app-woad-rho.vercel.app/mascots";
  const mascotSrc = getMascotSrc(baseUrl, state);

  return (
    <div className="droplet-scene" aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
      <img
        src={mascotSrc}
        alt="Animated Water Droplet Mascot"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain"
        }}
      />
    </div>
  );
}

