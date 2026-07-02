import { useState } from "react";

export function WaterMascot2D() {
  const [mascotIndex, setMascotIndex] = useState<number>(1);

  return (
    <div className="mascot-stage-2d" aria-label="Animated AI Water Meter droplet mascot">
      <div className="mascot-ripple-container">
        <div className="mascot-ripple animate-ripple-1"></div>
        <div className="mascot-ripple animate-ripple-2"></div>
      </div>
      
      <div className="mascot-image-wrapper">
        <img
          src={`/mascots/mascot_${mascotIndex}.png`}
          alt={`AI Water Meter mascot version ${mascotIndex}`}
          className="mascot-character"
        />
      </div>

      <div className="mascot-selector">
        <span>Select expression:</span>
        <div className="selector-buttons">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <button
              key={index}
              type="button"
              className={`selector-btn ${mascotIndex === index ? "active" : ""}`}
              onClick={() => setMascotIndex(index)}
              title={`Expression ${index}`}
            >
              {index}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
