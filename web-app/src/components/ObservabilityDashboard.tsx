import React, { useState, useEffect, useRef } from "react";

export interface ComparisonModel {
  name: string;
  waterMlPerToken: number;
  energyWhPerToken: number;
}

export const DEFAULT_COMPARISON_MODELS: ComparisonModel[] = [
  { name: "GPT-4o", waterMlPerToken: 0.05, energyWhPerToken: 0.003 },
  { name: "Claude 3.5 Sonnet", waterMlPerToken: 0.08, energyWhPerToken: 0.005 },
  { name: "Gemini 1.5 Pro", waterMlPerToken: 0.04, energyWhPerToken: 0.002 }
];

// 1. Latency Gauge
interface LatencyGaugeProps {
  value: number;
  warningThreshold?: number;
}

export const LatencyGauge: React.FC<LatencyGaugeProps> = ({
  value,
  warningThreshold = 500
}) => {
  const displayValue = value < 0 ? 0 : value;
  const isWarning = displayValue > warningThreshold;
  
  return (
    <div 
      className={`latency-gauge p-4 rounded border ${
        isWarning 
          ? "bg-red-950/40 border-red-500/50 text-red-400 warning-active" 
          : "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 warning-inactive"
      }`}
      style={{
        padding: "var(--space-md)",
        borderRadius: "8px",
        borderWidth: "1px",
        borderStyle: "solid",
        backdropFilter: "blur(12px)"
      }}
      data-testid="latency-gauge"
    >
      <span className="label" style={{ display: "block", fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }}>Latency:</span>
      <strong className="value" style={{ fontSize: "var(--fs-h2)", fontFamily: "var(--font-display)" }}>{displayValue}</strong>
      <span className="unit" style={{ fontSize: "var(--fs-caption)", marginLeft: "4px", color: "var(--color-text-muted)" }}>ms</span>
      {isWarning && <span className="warning-msg" style={{ display: "block", fontSize: "0.7rem", color: "oklch(0.65 0.2 25)", marginTop: "4px" }}>High Latency Alert!</span>}
    </div>
  );
};

// 2. Throughput Gauge
interface ThroughputGaugeProps {
  value: number;
  performanceThreshold?: number;
}

export const ThroughputGauge: React.FC<ThroughputGaugeProps> = ({
  value,
  performanceThreshold = 10
}) => {
  const displayValue = value < 0 ? 0 : value;
  const isWarning = displayValue < performanceThreshold;

  return (
    <div 
      className={`throughput-gauge p-4 rounded border ${
        isWarning 
          ? "bg-amber-950/40 border-amber-500/50 text-amber-400 warning-active" 
          : "bg-cyan-950/20 border-cyan-500/30 text-cyan-400 warning-inactive"
      }`}
      style={{
        padding: "var(--space-md)",
        borderRadius: "8px",
        borderWidth: "1px",
        borderStyle: "solid",
        backdropFilter: "blur(12px)"
      }}
      data-testid="throughput-gauge"
    >
      <span className="label" style={{ display: "block", fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }}>Throughput:</span>
      <strong className="value" style={{ fontSize: "var(--fs-h2)", fontFamily: "var(--font-display)" }}>{displayValue}</strong>
      <span className="unit" style={{ fontSize: "var(--fs-caption)", marginLeft: "4px", color: "var(--color-text-muted)" }}>tok/s</span>
      {isWarning && <span className="warning-msg" style={{ display: "block", fontSize: "0.7rem", color: "oklch(0.65 0.2 45)", marginTop: "4px" }}>Low Throughput Warning!</span>}
    </div>
  );
};

// 3. Burn Rate Gauge & GPU Equivalents
interface BurnRateGaugeProps {
  burnRateWh: number;
  gpuModel?: string;
  gpuEquivalencyFactor?: number; // Wh per GPU hour
}

export const BurnRateGauge: React.FC<BurnRateGaugeProps> = ({
  burnRateWh,
  gpuModel = "H100",
  gpuEquivalencyFactor = 700
}) => {
  const displayWh = burnRateWh < 0 ? 0 : burnRateWh;
  const factor = gpuEquivalencyFactor <= 0 ? 700 : gpuEquivalencyFactor;
  const gpuHours = displayWh / factor;
  const isWarning = displayWh > 1000;

  return (
    <div 
      className={`burn-rate-gauge p-4 rounded border ${
        isWarning 
          ? "bg-red-950/40 border-red-500/50 text-red-400 warning-active" 
          : "bg-purple-950/20 border-purple-500/30 text-purple-400 warning-inactive"
      }`}
      style={{
        padding: "var(--space-md)",
        borderRadius: "8px",
        borderWidth: "1px",
        borderStyle: "solid",
        backdropFilter: "blur(12px)"
      }}
      data-testid="burn-rate-gauge"
    >
      <span className="label" style={{ display: "block", fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }}>Burn Rate:</span>
      <strong className="value" style={{ fontSize: "var(--fs-h2)", fontFamily: "var(--font-display)" }}>{displayWh}</strong>
      <span className="unit" style={{ fontSize: "var(--fs-caption)", marginLeft: "4px", color: "var(--color-text-muted)" }}>Wh</span>
      <div className="gpu-equivalents" style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
        <span className="gpu-model">{gpuModel}</span> Equivalents:{" "}
        <strong className="gpu-hours">{gpuHours.toFixed(4)}</strong> hrs
      </div>
      {isWarning && <span className="warning-msg" style={{ display: "block", fontSize: "0.7rem", color: "oklch(0.65 0.2 25)", marginTop: "4px" }}>Critical Energy Consumption!</span>}
    </div>
  );
};

// 4. Sustainability Comparison Benchmark Widget
interface SustainabilityComparisonWidgetProps {
  selectedModel: string;
  comparisonModels?: ComparisonModel[];
  currentUsageWh: number;
  currentUsageWaterMl: number;
  onModelChange?: (modelName: string) => void;
}

export const SustainabilityComparisonWidget: React.FC<SustainabilityComparisonWidgetProps> = ({
  selectedModel,
  comparisonModels = DEFAULT_COMPARISON_MODELS,
  currentUsageWh,
  currentUsageWaterMl,
  onModelChange
}) => {
  if (comparisonModels.length === 0) {
    return <div className="sustainability-widget-empty" data-testid="sustainability-widget-empty" style={{ padding: "var(--space-md)", color: "var(--color-text-muted)" }}>No comparison data available</div>;
  }

  const activeModel = comparisonModels.find(m => m.name === selectedModel) || comparisonModels[0];
  const benchmarkWater = activeModel ? activeModel.waterMlPerToken * 1000 : 0;
  const benchmarkEnergy = activeModel ? activeModel.energyWhPerToken * 1000 : 0;

  const waterDiffPct = benchmarkWater > 0 ? ((currentUsageWaterMl - benchmarkWater) / benchmarkWater) * 100 : 0;
  const energyDiffPct = benchmarkEnergy > 0 ? ((currentUsageWh - benchmarkEnergy) / benchmarkEnergy) * 100 : 0;

  return (
    <div className="sustainability-widget bento-card" data-testid="sustainability-widget">
      <h3 className="title" style={{ margin: "0 0 var(--space-sm)", fontSize: "var(--fs-h3)" }}>Sustainability Benchmark</h3>
      <div className="selector-container" style={{ marginBottom: "var(--space-sm)", display: "flex", gap: "10px", alignItems: "center" }}>
        <label htmlFor="model-select">Compare to:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => onModelChange?.(e.target.value)}
          className="model-select"
          style={{
            background: "#0d111d",
            border: "1px solid var(--color-border-light)",
            borderRadius: "6px",
            color: "#fff",
            padding: "4px 8px"
          }}
        >
          {comparisonModels.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="comparison-results" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-sm)" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "var(--space-sm)", borderRadius: "6px" }}>
          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Water Comparison</span>
          <span style={{ fontSize: "1.1rem" }}>{benchmarkWater} mL</span>
          <span className="water-diff" style={{ display: "block", fontSize: "0.75rem", color: waterDiffPct >= 0 ? "oklch(0.65 0.2 25)" : "var(--color-cyan)", marginTop: "2px" }}>
            Difference: {waterDiffPct >= 0 ? "+" : ""}{waterDiffPct.toFixed(1)}%
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "var(--space-sm)", borderRadius: "6px" }}>
          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Energy Comparison</span>
          <span style={{ fontSize: "1.1rem" }}>{benchmarkEnergy} Wh</span>
          <span className="energy-diff" style={{ display: "block", fontSize: "0.75rem", color: energyDiffPct >= 0 ? "oklch(0.65 0.2 25)" : "var(--color-cyan)", marginTop: "2px" }}>
            Difference: {energyDiffPct >= 0 ? "+" : ""}{energyDiffPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// 5. Stream Animator
interface StreamAnimatorProps {
  isStreaming: boolean;
  speed: number;
  onTick?: () => void;
  children: React.ReactNode;
}

export const StreamAnimator: React.FC<StreamAnimatorProps> = ({
  isStreaming,
  speed,
  onTick,
  children
}) => {
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    if (!isStreaming) return;

    const actualSpeed = speed <= 0 ? 100 : speed;
    const interval = setInterval(() => {
      onTickRef.current?.();
    }, actualSpeed);

    return () => clearInterval(interval);
  }, [isStreaming, speed]);

  return (
    <div 
      className={`stream-animator ${isStreaming ? "is-animating" : "is-paused"}`}
      data-testid="stream-animator"
    >
      {children}
    </div>
  );
};

// 6. Mascot (Pip)
interface MascotProps {
  state: "idle" | "happy" | "thinking" | "warning";
  customMessage?: string;
  onTipsCycle?: (newIndex: number) => void;
}

export const PIP_TIPS = [
  "Tip 1: Use smaller models when possible",
  "Tip 2: Cache frequent prompts",
  "Tip 3: Avoid redundant generations"
];

export const Mascot: React.FC<MascotProps> = ({
  state,
  customMessage,
  onTipsCycle
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  const getSpeechBubbleMessage = () => {
    if (customMessage) return customMessage;
    switch (state) {
      case "thinking": return "Analyzing stream... I see tokens flowing!";
      case "warning": return "Watch out! We are consuming a lot of resources!";
      case "happy": return "Great job! Keeping resource footprint low!";
      case "idle":
      default:
        return "I'm Pip! Let's monitor some AI resource usage.";
    }
  };

  const handleMascotClick = () => {
    const nextIndex = (tipIndex + 1) % PIP_TIPS.length;
    setTipIndex(nextIndex);
    onTipsCycle?.(nextIndex);
  };

  return (
    <div 
      className={`mascot-container mascot-${state} p-4 flex items-center cursor-pointer`}
      onClick={handleMascotClick}
      data-testid="mascot"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        cursor: "pointer"
      }}
    >
      <div 
        className="mascot-avatar"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--color-blue), var(--color-cyan))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.4rem",
          fontWeight: "bold",
          boxShadow: "0 0 15px rgba(0,242,254,0.3)"
        }}
      >
        {state === "thinking" ? "🤔" : state === "warning" ? "⚠️" : state === "happy" ? "😊" : "💧"}
      </div>
      <div 
        className="speech-bubble"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "8px",
          padding: "var(--space-xs) var(--space-sm)",
          maxWidth: "320px"
        }}
      >
        <span className="speech-text text-sm" style={{ display: "block", fontSize: "0.85rem", color: "#fff" }}>{getSpeechBubbleMessage()}</span>
        <div className="tip-text" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px", fontStyle: "italic" }}>{PIP_TIPS[tipIndex]}</div>
      </div>
    </div>
  );
};

// 7. Observability Dashboard (Orchestrator)
interface ObservabilityDashboardProps {
  initialLatency?: number;
  initialThroughput?: number;
  initialBurnRate?: number;
  initialWater?: number;
  initialEnergy?: number;
  initialStreaming?: boolean;
  initialMockMode?: boolean;
  initialSelectedModel?: string;
  initialGpuProfile?: string;
  comparisonModels?: ComparisonModel[];
}

export const ObservabilityDashboard: React.FC<ObservabilityDashboardProps> = ({
  initialLatency = 120,
  initialThroughput = 30,
  initialBurnRate = 150,
  initialWater = 500,
  initialEnergy = 20,
  initialStreaming = false,
  initialMockMode = true,
  initialSelectedModel = "GPT-4o",
  initialGpuProfile = "H100",
  comparisonModels = DEFAULT_COMPARISON_MODELS
}) => {
  const [isStreaming, setIsStreaming] = useState(initialStreaming);
  const [speed, setSpeed] = useState(100);
  const [latency, setLatency] = useState(initialLatency);
  const [throughput, setThroughput] = useState(initialThroughput);
  const [burnRate, setBurnRate] = useState(initialBurnRate);
  const [totalWaterMl, setTotalWaterMl] = useState(initialWater);
  const [totalEnergyWh, setTotalEnergyWh] = useState(initialEnergy);
  const [selectedModel, setSelectedModel] = useState(initialSelectedModel);
  const [isMockMode, setIsMockMode] = useState(initialMockMode);
  const [gpuProfile, setGpuProfile] = useState(initialGpuProfile);
  const [isMascotMuted, setIsMascotMuted] = useState(false);
  const [exportTriggered, setExportTriggered] = useState(false);

  const handleTick = () => {
    setTotalWaterMl(prev => prev + 1.5);
    setTotalEnergyWh(prev => prev + 0.1);
    setLatency(prev => {
      const next = prev + (Math.random() * 20 - 10);
      return next < 0 ? 0 : Math.round(next);
    });
    setThroughput(prev => {
      const next = prev + (Math.random() * 4 - 2);
      return next < 0 ? 0 : Math.round(next * 10) / 10;
    });
  };

  const handleReset = () => {
    setLatency(0);
    setThroughput(0);
    setBurnRate(0);
    setTotalWaterMl(0);
    setTotalEnergyWh(0);
    setIsStreaming(false);
  };

  const handleStep = () => {
    handleTick();
  };

  const handleExport = () => {
    setExportTriggered(true);
  };

  let mascotState: MascotProps["state"] = "idle";
  if (isStreaming) {
    mascotState = "thinking";
  } else if (latency > 500 || throughput < 10 || burnRate > 1000) {
    mascotState = "warning";
  } else if (totalWaterMl > 0 && totalWaterMl < 300) {
    mascotState = "happy";
  }

  const gpuFactor = gpuProfile === "A100" ? 400 : 700;

  return (
    <StreamAnimator isStreaming={isStreaming} speed={speed} onTick={handleTick}>
      <div className="observability-dashboard bento-card" data-testid="dashboard" style={{ marginTop: "var(--space-md)", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "var(--fs-h2)", color: "var(--color-cyan)" }}>Telemetry telemetry</h2>
          <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              <input
                type="checkbox"
                checked={isMockMode}
                onChange={(e) => setIsMockMode(e.target.checked)}
                className="mock-mode-toggle"
              />
              Mock Simulation
            </label>
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              disabled={!isMockMode}
              className="btn-toggle-stream text-link"
              style={{ padding: "4px 10px", minHeight: "auto", fontSize: "0.8rem", display: "inline-flex" }}
            >
              {isStreaming ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleStep}
              disabled={!isMockMode || isStreaming}
              className="btn-step text-link"
              style={{ padding: "4px 10px", minHeight: "auto", fontSize: "0.8rem", display: "inline-flex" }}
            >
              Step
            </button>
            <button
              onClick={handleReset}
              disabled={!isMockMode}
              className="btn-reset text-link"
              style={{ padding: "4px 10px", minHeight: "auto", fontSize: "0.8rem", display: "inline-flex", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              className="btn-export text-link"
              style={{ padding: "4px 10px", minHeight: "auto", fontSize: "0.8rem", display: "inline-flex" }}
            >
              Export
            </button>
          </div>
        </div>

        {isMockMode && (
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", marginBottom: "var(--space-sm)", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
              Speed:
              <input
                type="range"
                min="50"
                max="1000"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={!isMockMode}
                className="speed-slider"
              />
              <span>{speed}ms</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
              GPU Target:
              <select
                value={gpuProfile}
                onChange={(e) => setGpuProfile(e.target.value)}
                disabled={!isMockMode}
                className="gpu-profile-select"
                style={{ background: "#0d111d", border: "1px solid var(--color-border-light)", color: "#fff", borderRadius: "4px", padding: "2px 6px" }}
              >
                <option value="H100">NVIDIA H100 (700W)</option>
                <option value="A100">NVIDIA A100 (400W)</option>
              </select>
            </label>
          </div>
        )}

        {!isMascotMuted && (
          <div className="mascot-wrapper" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,242,254,0.03)", padding: "8px", borderRadius: "8px", marginBottom: "var(--space-sm)" }}>
            <Mascot state={mascotState} />
            <button
              onClick={() => setIsMascotMuted(true)}
              className="btn-mute"
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              title="Mute Pip"
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
          <LatencyGauge value={latency} />
          <ThroughputGauge value={throughput} />
          <BurnRateGauge burnRateWh={burnRate} gpuModel={gpuProfile} gpuEquivalencyFactor={gpuFactor} />
        </div>

        <div className="totals" style={{ background: "rgba(255,255,255,0.02)", padding: "var(--space-sm)", borderRadius: "8px", marginBottom: "var(--space-md)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Telemetry Metrics</h3>
          <p style={{ margin: "4px 0" }}>Total Water: <strong className="total-water" style={{ color: "var(--color-cyan)" }}>{totalWaterMl.toFixed(1)} ml</strong></p>
          <p style={{ margin: "4px 0" }}>Total Energy: <strong className="total-energy" style={{ color: "var(--color-blue)" }}>{totalEnergyWh.toFixed(1)} Wh</strong></p>
        </div>

        <SustainabilityComparisonWidget
          selectedModel={selectedModel}
          currentUsageWh={totalEnergyWh}
          currentUsageWaterMl={totalWaterMl}
          onModelChange={setSelectedModel}
        />

        {exportTriggered && (
          <div className="export-success" data-testid="export-success" style={{ color: "var(--color-cyan)", fontSize: "0.85rem", textAlign: "center", marginTop: "var(--space-sm)", fontWeight: "bold" }}>
            Telemetry data exported successfully!
          </div>
        )}
      </div>
    </StreamAnimator>
  );
};
