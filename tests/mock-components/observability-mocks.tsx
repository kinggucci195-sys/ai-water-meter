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

export const LatencyGauge: React.FC<LatencyGaugeProps> = ({ value, warningThreshold = 500 }) => {
  const displayValue = value < 0 ? 0 : value;
  const isWarning = displayValue > warningThreshold;

  return (
    <div
      className={`latency-gauge p-4 rounded border ${
        isWarning
          ? "bg-red-500 font-bold border-red-700 text-red-600 warning-active"
          : "bg-green-500 text-green-600 warning-inactive"
      }`}
      data-testid="latency-gauge"
    >
      <span className="label">Latency:</span>
      <span className="value">{displayValue}</span>
      <span className="unit">ms</span>
      {isWarning && <span className="warning-msg">High Latency Alert!</span>}
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
          ? "bg-yellow-500 border-yellow-700 text-yellow-800 warning-active"
          : "bg-blue-500 text-blue-800 warning-inactive"
      }`}
      data-testid="throughput-gauge"
    >
      <span className="label">Throughput:</span>
      <span className="value">{displayValue}</span>
      <span className="unit">tok/s</span>
      {isWarning && <span className="warning-msg">Low Throughput Warning!</span>}
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
        isWarning ? "warning-active bg-red-600 text-white" : "warning-inactive bg-gray-200"
      }`}
      data-testid="burn-rate-gauge"
    >
      <span className="label">Burn Rate:</span>
      <span className="value">{displayWh}</span>
      <span className="unit">Wh</span>
      <div className="gpu-equivalents">
        <span className="gpu-model">{gpuModel}</span> Equivalents:{" "}
        <span className="gpu-hours">{gpuHours.toFixed(4)}</span> hrs
      </div>
      {isWarning && <span className="warning-msg">Critical Energy Consumption!</span>}
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
    return (
      <div className="sustainability-widget-empty" data-testid="sustainability-widget-empty">
        No comparison data available
      </div>
    );
  }

  const activeModel = comparisonModels.find((m) => m.name === selectedModel) || comparisonModels[0];

  // Standard benchmark is based on 1000 tokens
  const benchmarkWater = activeModel ? activeModel.waterMlPerToken * 1000 : 0;
  const benchmarkEnergy = activeModel ? activeModel.energyWhPerToken * 1000 : 0;

  // Real calculations
  const waterDiffPct =
    benchmarkWater > 0 ? ((currentUsageWaterMl - benchmarkWater) / benchmarkWater) * 100 : 0;
  const energyDiffPct =
    benchmarkEnergy > 0 ? ((currentUsageWh - benchmarkEnergy) / benchmarkEnergy) * 100 : 0;

  return (
    <div
      className="sustainability-widget p-4 rounded border bg-white"
      data-testid="sustainability-widget"
    >
      <h3 className="title text-lg font-bold">Sustainability Benchmark</h3>
      <div className="selector-container my-2">
        <label htmlFor="model-select">Compare to:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => onModelChange?.(e.target.value)}
          className="model-select border p-1 rounded ml-2"
        >
          {comparisonModels.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="comparison-results">
        <div className="water-comparison">
          <span>Active Model standard (1k tok): {benchmarkWater} ml</span>
          <span className="water-diff ml-2">
            Difference: {waterDiffPct >= 0 ? "+" : ""}
            {waterDiffPct.toFixed(1)}%
          </span>
        </div>
        <div className="energy-comparison">
          <span>Active Model standard (1k tok): {benchmarkEnergy} Wh</span>
          <span className="energy-diff ml-2">
            Difference: {energyDiffPct >= 0 ? "+" : ""}
            {energyDiffPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// 5. Stream Animator
interface StreamAnimatorProps {
  isStreaming: boolean;
  speed: number; // ms per tick
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
      className={`stream-animator ${isStreaming ? "is-animating font-medium text-indigo-600" : "is-paused"}`}
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

export const Mascot: React.FC<MascotProps> = ({ state, customMessage, onTipsCycle }) => {
  const [tipIndex, setTipIndex] = useState(0);

  const getSpeechBubbleMessage = () => {
    if (customMessage) return customMessage;
    switch (state) {
      case "thinking":
        return "Analyzing stream... I see tokens flowing!";
      case "warning":
        return "Watch out! We are consuming a lot of resources!";
      case "happy":
        return "Great job! Keeping resource footprint low!";
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
    >
      <div className="mascot-avatar w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center font-bold">
        {state === "thinking" ? "🤔" : state === "warning" ? "⚠️" : state === "happy" ? "😊" : "🦉"}
      </div>
      <div className="speech-bubble bg-gray-100 p-2 rounded ml-3 border max-w-xs relative">
        <span className="speech-text text-sm">{getSpeechBubbleMessage()}</span>
        <div className="tip-text text-xs text-gray-500 mt-1 italic">{PIP_TIPS[tipIndex]}</div>
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
  const [historyData] = useState<Array<{ date: string; water: number; energy: number }>>([
    { date: "2026-07-02", water: 450, energy: 18 }
  ]);
  const [exportTriggered, setExportTriggered] = useState(false);

  const handleTick = () => {
    setTotalWaterMl((prev) => prev + 1.5);
    setTotalEnergyWh((prev) => prev + 0.1);
    // Add realistic variance
    setLatency((prev) => {
      const next = prev + (Math.random() * 20 - 10);
      return next < 0 ? 0 : Math.round(next);
    });
    setThroughput((prev) => {
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

  // Determine Mascot State
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
      <div
        className="observability-dashboard p-6 bg-slate-50 border rounded shadow max-w-[min(90rem,90vw)] mx-auto"
        data-testid="dashboard"
      >
        <h2 className="text-xl font-bold mb-4">AI Water Meter - Developer Observability</h2>

        {/* Mock Mode Control Panel */}
        <div className="control-panel p-4 bg-white border rounded mb-4">
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isMockMode}
                onChange={(e) => setIsMockMode(e.target.checked)}
                className="mock-mode-toggle"
              />
              Mock Mode Simulation
            </label>

            <button
              onClick={() => setIsStreaming(!isStreaming)}
              disabled={!isMockMode}
              className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50 btn-toggle-stream"
            >
              {isStreaming ? "Pause" : "Start"} Streaming
            </button>

            <button
              onClick={handleStep}
              disabled={!isMockMode || isStreaming}
              className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 btn-step"
            >
              Step
            </button>

            <button
              onClick={handleReset}
              disabled={!isMockMode}
              className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50 btn-reset"
            >
              Reset
            </button>

            <button
              onClick={handleExport}
              className="px-3 py-1 bg-green-600 text-white rounded btn-export"
            >
              Export
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              Animation Speed:
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

            <label className="flex items-center gap-2">
              GPU Profile:
              <select
                value={gpuProfile}
                onChange={(e) => setGpuProfile(e.target.value)}
                disabled={!isMockMode}
                className="gpu-profile-select border p-1 rounded"
              >
                <option value="H100">NVIDIA H100 (700Wh)</option>
                <option value="A100">NVIDIA A100 (400Wh)</option>
              </select>
            </label>
          </div>
        </div>

        {/* Mascot & Info */}
        {!isMascotMuted && (
          <div className="mascot-wrapper mb-4 flex items-center justify-between bg-blue-50 p-2 rounded">
            <Mascot state={mascotState} />
            <button
              onClick={() => setIsMascotMuted(true)}
              className="btn-mute text-gray-500 hover:text-red-500 font-bold px-2"
              title="Mute Pip"
            >
              [X]
            </button>
          </div>
        )}

        {/* Gauges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <LatencyGauge value={latency} />
          <ThroughputGauge value={throughput} />
          <BurnRateGauge
            burnRateWh={burnRate}
            gpuModel={gpuProfile}
            gpuEquivalencyFactor={gpuFactor}
          />
        </div>

        {/* Totals */}
        <div className="totals p-4 bg-gray-100 rounded border mb-4">
          <h3 className="font-semibold text-lg mb-2">Session Totals</h3>
          <p>
            Total Water Used:{" "}
            <span className="total-water text-indigo-700 font-bold">
              {totalWaterMl.toFixed(1)} ml
            </span>
          </p>
          <p>
            Total Energy Used:{" "}
            <span className="total-energy text-indigo-700 font-bold">
              {totalEnergyWh.toFixed(1)} Wh
            </span>
          </p>
          {historyData.length > 0 && (
            <p className="text-xs text-gray-500 italic mt-2">
              Loaded historical data for {historyData[0].date}: {historyData[0].water}ml /{" "}
              {historyData[0].energy}Wh
            </p>
          )}
        </div>

        {/* Sustainability Benchmark */}
        <SustainabilityComparisonWidget
          selectedModel={selectedModel}
          comparisonModels={comparisonModels}
          currentUsageWh={totalEnergyWh}
          currentUsageWaterMl={totalWaterMl}
          onModelChange={setSelectedModel}
        />

        {exportTriggered && (
          <div
            className="export-success text-green-700 font-semibold mt-2 text-center"
            data-testid="export-success"
          >
            Telemetry data exported successfully!
          </div>
        )}
      </div>
    </StreamAnimator>
  );
};
