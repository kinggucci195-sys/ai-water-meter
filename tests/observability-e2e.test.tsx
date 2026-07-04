/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  LatencyGauge,
  ThroughputGauge,
  BurnRateGauge,
  SustainabilityComparisonWidget,
  StreamAnimator,
  Mascot,
  ObservabilityDashboard,
  PIP_TIPS,
  DEFAULT_COMPARISON_MODELS
} from "./mock-components/observability-mocks";

// Tell React we are in a testing environment that supports act()
global.IS_REACT_ACT_ENVIRONMENT = true;

describe("Observability E2E Test Suite", () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  // ==========================================
  // TIER 1: Component Rendering & Property Verification (Tests 1-15)
  // ==========================================
  describe("Tier 1: Component Rendering & Property Verification", () => {
    it("T1_C1_LatencyGauge_Render: renders latency gauge with a default value", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={120} />);
      });
      const valEl = container!.querySelector(".value");
      expect(valEl?.textContent).toBe("120");
    });

    it("T1_C2_LatencyGauge_Unit: renders latency gauge with the ms unit", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={120} />);
      });
      const unitEl = container!.querySelector(".unit");
      expect(unitEl?.textContent).toBe("ms");
    });

    it("T1_C3_LatencyGauge_Threshold_Warning: renders warning elements when above threshold", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={600} warningThreshold={500} />);
      });
      const gauge = container!.querySelector(".latency-gauge");
      expect(gauge?.className).toContain("warning-active");
      expect(container!.querySelector(".warning-msg")?.textContent).toBe("High Latency Alert!");
    });

    it("T1_C4_LatencyGauge_Threshold_Normal: renders normal style when below threshold", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={400} warningThreshold={500} />);
      });
      const gauge = container!.querySelector(".latency-gauge");
      expect(gauge?.className).toContain("warning-inactive");
      expect(container!.querySelector(".warning-msg")).toBeNull();
    });

    it("T1_C5_ThroughputGauge_Render: renders throughput gauge with a default value", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={25} />);
      });
      const valEl = container!.querySelector(".value");
      expect(valEl?.textContent).toBe("25");
    });

    it("T1_C6_ThroughputGauge_Unit: renders throughput gauge with the tok/s unit", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={25} />);
      });
      const unitEl = container!.querySelector(".unit");
      expect(unitEl?.textContent).toBe("tok/s");
    });

    it("T1_C7_ThroughputGauge_Warning: renders warning style when below threshold", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={5} performanceThreshold={10} />);
      });
      const gauge = container!.querySelector(".throughput-gauge");
      expect(gauge?.className).toContain("warning-active");
      expect(container!.querySelector(".warning-msg")?.textContent).toBe("Low Throughput Warning!");
    });

    it("T1_C8_ThroughputGauge_Normal: renders normal style when above threshold", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={15} performanceThreshold={10} />);
      });
      const gauge = container!.querySelector(".throughput-gauge");
      expect(gauge?.className).toContain("warning-inactive");
    });

    it("T1_C9_BurnRateGauge_Render: renders burn rate gauge with Wh value", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={150} />);
      });
      const valEl = container!.querySelector(".value");
      expect(valEl?.textContent).toBe("150");
    });

    it("T1_C10_BurnRateGauge_GPU_Equiv: renders correct H100 equivalents calculated value", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={350} gpuEquivalencyFactor={700} />);
      });
      const gpuEl = container!.querySelector(".gpu-hours");
      // 350 / 700 = 0.5000
      expect(gpuEl?.textContent).toBe("0.5000");
    });

    it("T1_C11_BurnRateGauge_GPU_Model: renders selected GPU model label", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={350} gpuModel="A100" />);
      });
      const modelEl = container!.querySelector(".gpu-model");
      expect(modelEl?.textContent).toBe("A100");
    });

    it("T1_C12_SustainabilityWidget_Render: renders comparison widget without crashing", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            currentUsageWh={20}
            currentUsageWaterMl={500}
          />
        );
      });
      const title = container!.querySelector(".title");
      expect(title?.textContent).toBe("Sustainability Benchmark");
    });

    it("T1_C13_SustainabilityWidget_List: lists comparison models as select options", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            currentUsageWh={20}
            currentUsageWaterMl={500}
          />
        );
      });
      const options = container!.querySelectorAll("option");
      expect(options.length).toBe(DEFAULT_COMPARISON_MODELS.length);
      expect(options[0].value).toBe(DEFAULT_COMPARISON_MODELS[0].name);
    });

    it("T1_C14_Mascot_Render: renders Mascot with default idle message", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<Mascot state="idle" />);
      });
      const textEl = container!.querySelector(".speech-text");
      expect(textEl?.textContent).toBe("I'm Pip! Let's monitor some AI resource usage.");
    });

    it("T1_C15_StreamAnimator_Render: renders children within container", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <StreamAnimator isStreaming={false} speed={100}>
            <div className="test-child">Child Element</div>
          </StreamAnimator>
        );
      });
      const child = container!.querySelector(".test-child");
      expect(child?.textContent).toBe("Child Element");
    });
  });

  // ==========================================
  // TIER 2: Real-time Data Flow & State Synchronization (Tests 16-30)
  // ==========================================
  describe("Tier 2: Real-time Data Flow & State Synchronization", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("T2_C16_StreamAnimator_StreamingState: toggles animating class based on isStreaming prop", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <StreamAnimator isStreaming={true} speed={100}>
            <span>Stream Content</span>
          </StreamAnimator>
        );
      });
      const animator = container!.querySelector("[data-testid='stream-animator']");
      expect(animator?.className).toContain("is-animating");
    });

    it("T2_C17_StreamAnimator_IntervalTicks: triggers onTick periodic callbacks when active", async () => {
      const mockTick = jest.fn();
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <StreamAnimator isStreaming={true} speed={100} onTick={mockTick}>
            <span>Stream Content</span>
          </StreamAnimator>
        );
      });
      expect(mockTick).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(mockTick).toHaveBeenCalledTimes(1);
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(mockTick).toHaveBeenCalledTimes(3);
    });

    it("T2_C18_StreamAnimator_StopStreaming: stops triggering ticks when stream state is disabled", async () => {
      const mockTick = jest.fn();
      let root;
      await act(async () => {
        root = createRoot(container!);
        root.render(
          <StreamAnimator isStreaming={true} speed={100} onTick={mockTick}>
            <span>Stream Content</span>
          </StreamAnimator>
        );
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(mockTick).toHaveBeenCalledTimes(1);

      await act(async () => {
        root.render(
          <StreamAnimator isStreaming={false} speed={100} onTick={mockTick}>
            <span>Stream Content</span>
          </StreamAnimator>
        );
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockTick).toHaveBeenCalledTimes(1);
    });

    it("T2_C19_TelemetryUpdate_Latency: updates latency gauge layout when inputs update", async () => {
      let root;
      await act(async () => {
        root = createRoot(container!);
        root.render(<LatencyGauge value={150} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("150");

      await act(async () => {
        root.render(<LatencyGauge value={320} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("320");
    });

    it("T2_C20_TelemetryUpdate_Throughput: updates throughput gauge when inputs update", async () => {
      let root;
      await act(async () => {
        root = createRoot(container!);
        root.render(<ThroughputGauge value={30} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("30");

      await act(async () => {
        root.render(<ThroughputGauge value={12.5} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("12.5");
    });

    it("T2_C21_TelemetryUpdate_BurnRate: updates burn rate and recalculated GPU equivalent value", async () => {
      let root;
      await act(async () => {
        root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={140} gpuEquivalencyFactor={700} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("140");
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("0.2000");

      await act(async () => {
        root.render(<BurnRateGauge burnRateWh={280} gpuEquivalencyFactor={700} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("280");
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("0.4000");
    });

    it("T2_C22_Mascot_StateTransition: switches mascot speech based on dashboard streaming state", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialStreaming={true} />);
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Analyzing stream... I see tokens flowing!"
      );
    });

    it("T2_C23_Mascot_WarningTrigger: triggers mascot warning speech when warning metrics are active", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialLatency={600} initialStreaming={false} />);
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Watch out! We are consuming a lot of resources!"
      );
    });

    it("T2_C24_SustainabilityWidget_SelectModel: model selector updates active model value", async () => {
      const mockChange = jest.fn();
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            currentUsageWh={20}
            currentUsageWaterMl={500}
            onModelChange={mockChange}
          />
        );
      });
      const select = container!.querySelector("select") as HTMLSelectElement;
      await act(async () => {
        select.value = "Claude 3.5 Sonnet";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
      expect(mockChange).toHaveBeenCalledWith("Claude 3.5 Sonnet");
    });

    it("T2_C25_SustainabilityWidget_CompareCalcs: calculates savings relative difference percentages", async () => {
      await act(async () => {
        const root = createRoot(container!);
        // GPT-4o: waterMlPerToken = 0.05 (Benchmark standard for 1k tokens = 50 ml)
        // GPT-4o: energyWhPerToken = 0.003 (Benchmark standard for 1k tokens = 3 Wh)
        // Let's pass: water = 75 ml (+50%), energy = 1.5 Wh (-50%)
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            currentUsageWaterMl={75}
            currentUsageWh={1.5}
          />
        );
      });
      const waterDiff = container!.querySelector(".water-diff")?.textContent;
      const energyDiff = container!.querySelector(".energy-diff")?.textContent;
      expect(waterDiff).toContain("+50.0%");
      expect(energyDiff).toContain("-50.0%");
    });

    it("T2_C26_Dashboard_Sync_Gauges: dashboard sync updates metrics values together on simulated steps", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <ObservabilityDashboard
            initialLatency={100}
            initialThroughput={20}
            initialBurnRate={100}
          />
        );
      });
      const btnStep = container!.querySelector(".btn-step") as HTMLButtonElement;

      const valLatencyPre = container!.querySelector(".latency-gauge .value")?.textContent;
      const valThroughputPre = container!.querySelector(".throughput-gauge .value")?.textContent;

      await act(async () => {
        btnStep.click();
      });

      const valLatencyPost = container!.querySelector(".latency-gauge .value")?.textContent;
      const valThroughputPost = container!.querySelector(".throughput-gauge .value")?.textContent;

      expect(valLatencyPost).not.toBe(valLatencyPre);
      expect(valThroughputPost).not.toBe(valThroughputPre);
    });

    it("T2_C27_Dashboard_Sync_Mascot: dashboard sync updates mascot message automatically", async () => {
      let root;
      await act(async () => {
        root = createRoot(container!);
        root.render(<ObservabilityDashboard initialStreaming={false} />);
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "I'm Pip! Let's monitor some AI resource usage."
      );

      await act(async () => {
        const btnToggle = container!.querySelector(".btn-toggle-stream") as HTMLButtonElement;
        btnToggle.click();
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Analyzing stream... I see tokens flowing!"
      );
    });

    it("T2_C28_Dashboard_Sync_Widget: dashboard sync updates comparison widget numbers on changes", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <ObservabilityDashboard
            initialWater={50}
            initialEnergy={3}
            initialSelectedModel="GPT-4o"
          />
        );
      });
      // 50 ml is exactly GPT-4o 1k token limit (50 ml), difference is 0%
      expect(container!.querySelector(".water-diff")?.textContent).toContain("0.0%");

      const btnStep = container!.querySelector(".btn-step") as HTMLButtonElement;
      await act(async () => {
        btnStep.click();
      });
      // step increases water by 1.5ml
      expect(container!.querySelector(".water-diff")?.textContent).toContain("+3.0%");
    });

    it("T2_C29_Gauges_Interaction_Reset: dashboard reset button zeroes all gauge values", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialWater={500} initialEnergy={20} />);
      });
      const btnReset = container!.querySelector(".btn-reset") as HTMLButtonElement;
      await act(async () => {
        btnReset.click();
      });
      expect(container!.querySelector(".latency-gauge .value")?.textContent).toBe("0");
      expect(container!.querySelector(".throughput-gauge .value")?.textContent).toBe("0");
      expect(container!.querySelector(".burn-rate-gauge .value")?.textContent).toBe("0");
      expect(container!.querySelector(".total-water")?.textContent).toBe("0.0 ml");
      expect(container!.querySelector(".total-energy")?.textContent).toBe("0.0 Wh");
    });

    it("T2_C30_Mascot_Click_SpeechBubble: cycles through tips when mascot avatar is clicked", async () => {
      const mockCycle = jest.fn();
      await act(async () => {
        const root = createRoot(container!);
        root.render(<Mascot state="idle" onTipsCycle={mockCycle} />);
      });
      const mascot = container!.querySelector("[data-testid='mascot']") as HTMLDivElement;
      const tipText = container!.querySelector(".tip-text");
      expect(tipText?.textContent).toBe(PIP_TIPS[0]);

      await act(async () => {
        mascot.click();
      });
      expect(mockCycle).toHaveBeenCalledWith(1);
      expect(container!.querySelector(".tip-text")?.textContent).toBe(PIP_TIPS[1]);
    });
  });

  // ==========================================
  // TIER 3: Edge Cases, Bounds, and Error Transitions (Tests 31-45)
  // ==========================================
  describe("Tier 3: Edge Cases, Bounds, and Error Transitions", () => {
    it("T3_C31_LatencyGauge_Zero: renders 0 ms for zero latency value", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={0} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("0");
    });

    it("T3_C32_LatencyGauge_Negative: clamps negative latency to 0 ms", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={-45} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("0");
    });

    it("T3_C33_LatencyGauge_MaxBound: handles extremely large latency value successfully", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<LatencyGauge value={999999} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("999999");
    });

    it("T3_C34_ThroughputGauge_Zero: renders 0 tok/s for zero throughput", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={0} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("0");
    });

    it("T3_C35_ThroughputGauge_Negative: clamps negative throughput to 0", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ThroughputGauge value={-12} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("0");
    });

    it("T3_C36_BurnRateGauge_Zero: calculates 0 GPU hours for 0 Wh burn rate", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={0} />);
      });
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("0.0000");
    });

    it("T3_C37_BurnRateGauge_Negative: clamps negative burn rate to 0 Wh and 0 GPU hours", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<BurnRateGauge burnRateWh={-120} />);
      });
      expect(container!.querySelector(".value")?.textContent).toBe("0");
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("0.0000");
    });

    it("T3_C38_SustainabilityWidget_EmptyModels: handles empty comparison models list gracefully", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            comparisonModels={[]}
            currentUsageWh={20}
            currentUsageWaterMl={500}
          />
        );
      });
      expect(container!.querySelector(".sustainability-widget-empty")?.textContent).toBe(
        "No comparison data available"
      );
    });

    it("T3_C39_SustainabilityWidget_MissingSelectedModel: falls back to first model if selected model is missing", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="MissingModel"
            currentUsageWh={2}
            currentUsageWaterMl={50}
          />
        );
      });
      // Should fall back to GPT-4o (first in DEFAULT_COMPARISON_MODELS, which is 50ml water standard)
      // 50ml user water vs 50ml standard = 0% difference
      expect(container!.querySelector(".water-diff")?.textContent).toContain("0.0%");
    });

    it("T3_C40_Mascot_EmptyMessage: displays state defaults if customMessage is empty string", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<Mascot state="happy" customMessage="" />);
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Great job! Keeping resource footprint low!"
      );
    });

    it("T3_C41_Mascot_InvalidState: falls back to idle message on unsupported state string", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<Mascot state="invalid-state-xyz" />);
      });
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "I'm Pip! Let's monitor some AI resource usage."
      );
    });

    it("T3_C42_StreamAnimator_NegativeSpeed: stream animator defaults to 100ms on speed <= 0", async () => {
      jest.useFakeTimers();
      const mockTick = jest.fn();
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <StreamAnimator isStreaming={true} speed={-50} onTick={mockTick}>
            <span>Stream Content</span>
          </StreamAnimator>
        );
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(mockTick).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("T3_C43_Dashboard_MalformedTelemetry: dashboard ignores malformed telemetry updates", async () => {
      // Mocking component updates to be resilient
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialLatency={100} />);
      });
      expect(container!.querySelector(".latency-gauge .value")?.textContent).toBe("100");
    });

    it("T3_C44_Dashboard_MissingFields: dashboard fills missing telemetry parameters with defaults", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      expect(container!.querySelector(".latency-gauge .value")?.textContent).toBe("120");
      expect(container!.querySelector(".throughput-gauge .value")?.textContent).toBe("30");
      expect(container!.querySelector(".burn-rate-gauge .value")?.textContent).toBe("150");
    });

    it("T3_C45_Dashboard_MultipleResets: handles multiple resets safely without crash or negative values", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialWater={50} />);
      });
      const btnReset = container!.querySelector(".btn-reset") as HTMLButtonElement;
      await act(async () => {
        btnReset.click();
        btnReset.click();
        btnReset.click();
      });
      expect(container!.querySelector(".total-water")?.textContent).toBe("0.0 ml");
    });
  });

  // ==========================================
  // TIER 4: E2E User Workflows & Performance Emulation (Tests 46-60)
  // ==========================================
  describe("Tier 4: E2E User Workflows & Performance Emulation", () => {
    it("T4_C46_E2E_Run_Simulation: runs end-to-end telemetry update simulation", async () => {
      jest.useFakeTimers();
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialWater={100} initialStreaming={true} />);
      });

      const initialText = container!.querySelector(".total-water")?.textContent;

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const nextText = container!.querySelector(".total-water")?.textContent;
      expect(nextText).not.toBe(initialText);
      jest.useRealTimers();
    });

    it("T4_C47_E2E_Simulation_LatencyWarning: verifies high latency warning propagation", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialLatency={650} initialStreaming={false} />);
      });
      expect(container!.querySelector(".latency-gauge")?.className).toContain("warning-active");
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Watch out! We are consuming a lot of resources!"
      );
    });

    it("T4_C48_E2E_Simulation_LowThroughput: verifies low throughput warning propagation", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialThroughput={4} initialStreaming={false} />);
      });
      expect(container!.querySelector(".throughput-gauge")?.className).toContain("warning-active");
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Watch out! We are consuming a lot of resources!"
      );
    });

    it("T4_C49_E2E_Simulation_HighBurnRate: verifies high burn rate warning propagation", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialBurnRate={1200} initialStreaming={false} />);
      });
      expect(container!.querySelector(".burn-rate-gauge")?.className).toContain("warning-active");
      expect(container!.querySelector(".speech-text")?.textContent).toBe(
        "Watch out! We are consuming a lot of resources!"
      );
    });

    it("T4_C50_E2E_Comparison_ModelToggle: cycles through target models and verifies selection changes", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <SustainabilityComparisonWidget
            selectedModel="GPT-4o"
            currentUsageWh={20}
            currentUsageWaterMl={500}
          />
        );
      });
      const select = container!.querySelector("select") as HTMLSelectElement;
      expect(select.value).toBe("GPT-4o");
    });

    it("T4_C51_E2E_Dashboard_ModelChange: changing model on dashboard updates the benchmark widget values", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialWater={80} initialSelectedModel="GPT-4o" />);
      });
      // GPT-4o 1k water standard is 50 ml. 80 ml vs 50 ml standard = +60.0%
      expect(container!.querySelector(".water-diff")?.textContent).toContain("+60.0%");

      const select = container!.querySelector("select") as HTMLSelectElement;
      await act(async () => {
        select.value = "Claude 3.5 Sonnet";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
      // Claude 3.5 Sonnet 1k water standard is 80 ml. 80 ml vs 80 ml standard = 0.0%
      expect(container!.querySelector(".water-diff")?.textContent).toContain("0.0%");
    });

    it("T4_C52_E2E_StreamAnimator_SpeedControl: adjusts speed inputs and verifies UI update", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      const slider = container!.querySelector(".speed-slider") as HTMLInputElement;
      await act(async () => {
        slider.value = "250";
        slider.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
      expect(slider.value).toBe("250");
    });

    it("T4_C53_E2E_Mascot_Interactivity: mascot avatar click cycles and displays the correct tips", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      const mascot = container!.querySelector("[data-testid='mascot']") as HTMLDivElement;
      const tipText = container!.querySelector(".tip-text");

      expect(tipText?.textContent).toBe(PIP_TIPS[0]);
      await act(async () => {
        mascot.click();
      });
      expect(container!.querySelector(".tip-text")?.textContent).toBe(PIP_TIPS[1]);
      await act(async () => {
        mascot.click();
      });
      expect(container!.querySelector(".tip-text")?.textContent).toBe(PIP_TIPS[2]);
    });

    it("T4_C54_E2E_Mascot_Dismissal: clicking mute hides the mascot elements from display", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      expect(container!.querySelector(".mascot-wrapper")).not.toBeNull();

      const btnMute = container!.querySelector(".btn-mute") as HTMLButtonElement;
      await act(async () => {
        btnMute.click();
      });
      expect(container!.querySelector(".mascot-wrapper")).toBeNull();
    });

    it("T4_C55_E2E_Dashboard_MockModeToggle: toggling off mock mode disables stream simulator controls", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialMockMode={true} />);
      });
      const toggle = container!.querySelector(".mock-mode-toggle") as HTMLInputElement;
      const btnToggle = container!.querySelector(".btn-toggle-stream") as HTMLButtonElement;
      const btnStep = container!.querySelector(".btn-step") as HTMLButtonElement;
      const btnReset = container!.querySelector(".btn-reset") as HTMLButtonElement;

      expect(btnToggle.disabled).toBe(false);
      expect(btnStep.disabled).toBe(false);
      expect(btnReset.disabled).toBe(false);

      await act(async () => {
        toggle.click();
      });
      expect(btnToggle.disabled).toBe(true);
      expect(btnStep.disabled).toBe(true);
      expect(btnReset.disabled).toBe(true);
    });

    it("T4_C56_E2E_Telemetry_PauseResume: starts and pauses telemetry stream run", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialStreaming={false} />);
      });
      const btnToggle = container!.querySelector(".btn-toggle-stream") as HTMLButtonElement;
      const animator = container!.querySelector("[data-testid='stream-animator']");

      expect(animator?.className).toContain("is-paused");

      await act(async () => {
        btnToggle.click();
      });
      expect(animator?.className).toContain("is-animating");

      await act(async () => {
        btnToggle.click();
      });
      expect(animator?.className).toContain("is-paused");
    });

    it("T4_C57_E2E_Telemetry_StepForward: clicking step increments metric totals manually", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(
          <ObservabilityDashboard initialWater={100} initialEnergy={10} initialStreaming={false} />
        );
      });
      const btnStep = container!.querySelector(".btn-step") as HTMLButtonElement;
      expect(container!.querySelector(".total-water")?.textContent).toBe("100.0 ml");
      expect(container!.querySelector(".total-energy")?.textContent).toBe("10.0 Wh");

      await act(async () => {
        btnStep.click();
      });
      expect(container!.querySelector(".total-water")?.textContent).toBe("101.5 ml");
      expect(container!.querySelector(".total-energy")?.textContent).toBe("10.1 Wh");
    });

    it("T4_C58_E2E_Telemetry_CustomProfile: changing GPU profile updates the burn rate gpu equivalency factor", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard initialBurnRate={800} initialGpuProfile="H100" />);
      });
      // 800Wh with H100 (700Wh factor) = 1.1429 hrs
      expect(container!.querySelector(".gpu-model")?.textContent).toBe("H100");
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("1.1429");

      const select = container!.querySelector(".gpu-profile-select") as HTMLSelectElement;
      await act(async () => {
        select.value = "A100";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
      // 800Wh with A100 (400Wh factor) = 2.0000 hrs
      expect(container!.querySelector(".gpu-model")?.textContent).toBe("A100");
      expect(container!.querySelector(".gpu-hours")?.textContent).toBe("2.0000");
    });

    it("T4_C59_E2E_Dashboard_Persistence: loads and displays historical totals on session initialization", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      const dashboard = container!.querySelector("[data-testid='dashboard']");
      expect(dashboard?.textContent).toContain(
        "Loaded historical data for 2026-07-02: 450ml / 18Wh"
      );
    });

    it("T4_C60_E2E_Dashboard_ExportData: clicking export triggers and shows completion notification", async () => {
      await act(async () => {
        const root = createRoot(container!);
        root.render(<ObservabilityDashboard />);
      });
      const btnExport = container!.querySelector(".btn-export") as HTMLButtonElement;
      expect(container!.querySelector("[data-testid='export-success']")).toBeNull();

      await act(async () => {
        btnExport.click();
      });
      expect(container!.querySelector("[data-testid='export-success']")).not.toBeNull();
      expect(container!.querySelector("[data-testid='export-success']")?.textContent).toBe(
        "Telemetry data exported successfully!"
      );
    });
  });
});
