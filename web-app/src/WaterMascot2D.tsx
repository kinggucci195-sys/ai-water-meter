import { useEffect, useState } from "react";

export function WaterMascot2D() {
  const [mascotIndex, setMascotIndex] = useState<number>(1);
  const [isWiggling, setIsWiggling] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsWiggling(true);
      setMascotIndex((prev) => (prev % 6) + 1);
      
      const timer = setTimeout(() => {
        setIsWiggling(false);
      }, 500); // matches the 0.5s CSS wiggle duration
      
      return () => clearTimeout(timer);
    }, 5000); // changes expression every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const triggerManualWiggle = () => {
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 500);
  };

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
          className={`mascot-character ${isWiggling ? "wiggling" : ""}`}
          onClick={triggerManualWiggle}
        />
      </div>
    </div>
  );
}
