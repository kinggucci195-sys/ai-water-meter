import type { MascotState } from "./mascot-state";

export function DropletScene({ state }: { state: MascotState }) {
  // Determine class name for animation and specific facial states
  let animationClass = "droplet-ambient";
  let mouthPath = "M 43 64 Q 50 69 57 64"; // Default gentle smile
  let isThinking = false;
  let isSad = false;
  let isConfused = false;
  let isError = false;
  let isHappy = false;

  switch (state) {
    case "new_prompt":
    case "reset":
      animationClass = "droplet-cheer";
      isHappy = true;
      break;
    case "streaming_output":
      animationClass = "droplet-streaming";
      isHappy = true;
      break;
    case "updated":
      animationClass = "droplet-ambient";
      isHappy = true;
      break;
    case "long_or_heavy":
      animationClass = "droplet-sad";
      isSad = true;
      break;
    case "uncertain":
      animationClass = "droplet-confused";
      isConfused = true;
      break;
    case "error":
      animationClass = "droplet-error";
      isError = true;
      break;
    case "baseline":
    case "idle":
    default:
      animationClass = "droplet-ambient";
      break;
  }

  return (
    <div className="droplet-scene" aria-hidden="true" style={{ position: "relative", width: "4.5rem", height: "4.5rem" }}>
      <style>{`
        @keyframes ambient-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes stream-pulse {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.04, 0.96) translateY(-1px); }
        }
        @keyframes cheer-jump {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(0.96, 1.04); }
        }
        @keyframes error-jitter {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
        }
        @keyframes eye-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes tear-drop {
          0% { transform: translateY(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(12px); opacity: 0; }
        }
        @keyframes bubble-up {
          0% { transform: translateY(40px) translateX(0) scale(0.4); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10px) translateX(var(--x-offset, 4px)) scale(1); opacity: 0; }
        }
        .droplet-ambient { animation: ambient-float 3s ease-in-out infinite; transform-origin: center; }
        .droplet-streaming { animation: stream-pulse 0.4s ease-in-out infinite; transform-origin: bottom center; }
        .droplet-cheer { animation: cheer-jump 0.5s ease-in-out infinite; transform-origin: bottom center; }
        .droplet-error { animation: error-jitter 0.1s linear infinite; transform-origin: center; }
        .droplet-sad { animation: ambient-float 4s ease-in-out infinite; transform-origin: center; }
        .droplet-confused { animation: ambient-float 3s ease-in-out infinite; transform-origin: center; }
        
        .eye-wink { animation: eye-blink 4s ease-in-out infinite; transform-origin: 35px 52px; }
        .eye-wink-right { animation: eye-wink 4s ease-in-out infinite; transform-origin: 65px 52px; }
        .tear { animation: tear-drop 2s ease-in-out infinite; }
        .bubble-1 { animation: bubble-up 1.2s infinite; --x-offset: 6px; }
        .bubble-2 { animation: bubble-up 1.6s infinite 0.4s; --x-offset: -6px; }
      `}</style>

      {/* Floating Bubbles during streaming */}
      {state === "streaming_output" && (
        <>
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            <circle cx="25" cy="50" r="3" fill="#fff" className="bubble-1" />
            <circle cx="75" cy="45" r="2.5" fill="#fff" className="bubble-2" />
          </svg>
        </>
      )}

      {/* Main Mascot SVG */}
      <svg
        viewBox="0 0 100 100"
        className={animationClass}
        style={{
          width: "100%",
          height: "100%",
          filter: isError ? "drop-shadow(0 0 8px #ef4444)" : "drop-shadow(0 4px 10px rgba(0,242,254,0.15))"
        }}
      >
        <defs>
          <linearGradient id="dropletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isError ? "#ff8a8a" : "#e0f7fc"} />
            <stop offset="60%" stopColor={isError ? "#ef4444" : "#4dd0e1"} />
            <stop offset="100%" stopColor={isError ? "#b91c1c" : "#00acc1"} />
          </linearGradient>
        </defs>

        {/* Droplet Base Body */}
        <path
          d="M 50 15 C 35 45 20 60 20 75 A 30 30 0 1 0 80 75 C 80 60 65 45 50 15 Z"
          fill="url(#dropletGrad)"
          stroke={isError ? "#7f1d1d" : "#00838f"}
          strokeWidth="2.5"
        />

        {/* Shiny Highlight */}
        <path
          d="M 33 50 A 20 20 0 0 1 50 33"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Eyes */}
        {isError ? (
          <>
            {/* Crossed eyes */}
            <path d="M 30 47 L 40 57 M 40 47 L 30 57" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
            <path d="M 60 47 L 70 57 M 70 47 L 60 57" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : isHappy ? (
          <>
            {/* Winking eye / happy arches */}
            <path d="M 28 55 Q 35 47 42 55" fill="none" stroke="#004d40" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="65" cy="52" r="5" fill="#004d40" className="eye-wink-right" />
          </>
        ) : isConfused ? (
          <>
            {/* Swirl eyes */}
            <path d="M 30 52 Q 35 47 35 52 T 30 52" fill="none" stroke="#004d40" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 65 52 Q 70 47 70 52 T 65 52" fill="none" stroke="#004d40" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : isSad ? (
          <>
            {/* Worried eyes */}
            <circle cx="35" cy="52" r="5.5" fill="#004d40" />
            <circle cx="65" cy="52" r="5.5" fill="#004d40" />
            <path d="M 28 44 Q 35 48 42 44" fill="none" stroke="#004d40" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 58 44 Q 65 48 72 44" fill="none" stroke="#004d40" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Standard cute eyes with winking loop */}
            <circle cx="35" cy="52" r="5" fill="#004d40" className="eye-wink" />
            <circle cx="65" cy="52" r="5" fill="#004d40" className="eye-wink-right" />
          </>
        )}

        {/* Mouth */}
        {isError ? (
          <path d="M 43 68 Q 50 63 57 68" fill="none" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
        ) : isHappy ? (
          // Happy Open Mouth
          <path d="M 44 65 Q 50 75 56 65 Z" fill="#004d40" />
        ) : isSad ? (
          // Frown mouth
          <path d="M 43 70 Q 50 64 57 70" fill="none" stroke="#004d40" strokeWidth="3" strokeLinecap="round" />
        ) : isConfused ? (
          // Straight mouth
          <line x1="43" y1="65" x2="57" y2="65" stroke="#004d40" strokeWidth="3" strokeLinecap="round" />
        ) : (
          // Normal smile
          <path d="M 43 64 Q 50 69 57 64" fill="none" stroke="#004d40" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Rosy Cheeks */}
        {!isError && (
          <>
            <circle cx="26" cy="60" r="3.5" fill="#ffb74d" opacity="0.6" />
            <circle cx="74" cy="60" r="3.5" fill="#ffb74d" opacity="0.6" />
          </>
        )}

        {/* Sad Tear animation */}
        {isSad && (
          <path
            d="M 33 60 C 33 63 35 65 35 65 C 35 65 37 63 37 60 C 37 58 33 58 33 60 Z"
            fill="#80deea"
            className="tear"
          />
        )}
      </svg>
    </div>
  );
}

