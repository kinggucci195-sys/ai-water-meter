import * as vscode from "vscode";
import { estimateUsage, sumEstimates, type UsageEstimate } from "../../src/estimator/estimate";
import { formatCarbon, formatMilliliters, formatWh } from "../../src/estimator/format";

type StoredUsage = UsageEstimate & {
  updatedAt: string;
};

const STORE_KEY = "aiWaterMeter.today";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "aiWaterMeter.openMethodology";
  context.subscriptions.push(statusBar);

  const refreshStatus = async () => {
    const usage = context.globalState.get<StoredUsage>(STORE_KEY);
    statusBar.text = usage
      ? `$(droplet) ${formatMilliliters(usage.totalWaterMl)} today`
      : "$(droplet) AI Water Meter";
    statusBar.tooltip = usage
      ? `Estimated locally: ${formatWh(usage.energyWh)}, ${formatCarbon(usage.carbonGrams)}`
      : "Estimate selected AI text locally.";
    statusBar.show();
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      for (const change of event.contentChanges) {
        const text = change.text.trim();
        if (text.length > 15) {
          await recordText(context, text, refreshStatus);
        }
      }
    }),
    vscode.commands.registerCommand("aiWaterMeter.estimateSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      const text = editor
        ? editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection)
        : "";
      await recordText(context, text, refreshStatus);
    }),
    vscode.commands.registerCommand("aiWaterMeter.estimateClipboard", async () => {
      const text = await vscode.env.clipboard.readText();
      await recordText(context, text, refreshStatus);
    }),
    vscode.commands.registerCommand("aiWaterMeter.resetToday", async () => {
      await context.globalState.update(STORE_KEY, undefined);
      await refreshStatus();
      vscode.window.showInformationMessage("AI Water Meter reset today's local estimate.");
    }),
    vscode.commands.registerCommand("aiWaterMeter.signIn", () => {
      void vscode.env.openExternal(vscode.Uri.parse("https://web-app-woad-rho.vercel.app/account"));
    }),
    vscode.commands.registerCommand("aiWaterMeter.openMethodology", () => {
      void vscode.env.openExternal(
        vscode.Uri.parse("https://github.com/kinggucci195-sys/ai-water-meter/blob/main/DATASET.md")
      );
    }),
    vscode.window.registerUriHandler(new AIWaterMeterUriHandler(context, refreshStatus))
  );

  await refreshStatus();
}

class AIWaterMeterUriHandler implements vscode.UriHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private refreshStatus: () => Promise<void>
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path === "/auth") {
      const params = new URLSearchParams(uri.query);
      const token = params.get("token");
      const userId = params.get("userId");

      if (token && userId) {
        const config = vscode.workspace.getConfiguration("aiWaterMeter");
        await Promise.all([
          config.update("supabaseToken", token, vscode.ConfigurationTarget.Global),
          config.update("supabaseUserId", userId, vscode.ConfigurationTarget.Global)
        ]);

        vscode.window.showInformationMessage(
          "🔌 AI Water Meter: Successfully connected to your Cloud Account!"
        );
        await this.refreshStatus();
      }
    }
  }
}

export function deactivate(): void {
  // No background resources to release.
}

async function recordText(
  context: vscode.ExtensionContext,
  text: string,
  refreshStatus: () => Promise<void>
): Promise<void> {
  const normalized = text.trim();
  if (!normalized) {
    vscode.window.showWarningMessage("Select or copy AI text before estimating.");
    return;
  }

  const estimate = estimateUsage({ responseText: normalized });
  const previous = context.globalState.get<StoredUsage>(STORE_KEY);
  const next: StoredUsage = {
    ...sumEstimates([previous ?? emptyEstimate(), estimate]),
    updatedAt: new Date().toISOString()
  };

  await context.globalState.update(STORE_KEY, next);
  await refreshStatus();

  // If Supabase credentials are configured in VS Code settings, sync in real-time
  const config = vscode.workspace.getConfiguration("aiWaterMeter");
  const supabaseToken = config.get<string>("supabaseToken");
  const supabaseUserId = config.get<string>("supabaseUserId");

  if (supabaseToken && supabaseUserId) {
    void syncUsageToSupabase(context, next)
      .then(() => {
        vscode.window.showInformationMessage(
          `Estimated ${formatMilliliters(estimate.totalWaterMl)}: Synced to Cloud Leaderboard!`
        );
      })
      .catch((err) => {
        console.error("VS Code telemetry sync failed:", err);
      });
  } else {
    vscode.window.showInformationMessage(
      `Estimated ${formatMilliliters(estimate.totalWaterMl)} for this text. Local only.`
    );
  }
}

async function syncUsageToSupabase(
  context: vscode.ExtensionContext,
  daily: StoredUsage
): Promise<void> {
  const config = vscode.workspace.getConfiguration("aiWaterMeter");
  const token = config.get<string>("supabaseToken");
  const userId = config.get<string>("supabaseUserId");

  if (!token || !userId) {
    return;
  }

  let deviceId = context.globalState.get<string>("deviceId");
  if (!deviceId) {
    deviceId = generateUUID();
    await context.globalState.update("deviceId", deviceId);
  }

  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3lud3hwamtya3d2a3J1Y296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODc4ODQsImV4cCI6MjA5ODU2Mzg4NH0.iijDhvQMy4AdlBVu3KvOmXAHb6MaSUK09568It-tUWk";
  const supabaseUrl = "https://ffgynwxpjkrkwvkrucoz.supabase.co";
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const todayDate = `${year}-${month}-${day}`;

  // 1. Register VS Code client device
  try {
    await fetch(`${supabaseUrl}/rest/v1/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        Prefer: "resolution=ignore-duplicates"
      },
      body: JSON.stringify({
        id: deviceId,
        user_id: userId,
        client_kind: "vscode_extension",
        client_version: "0.1.0"
      })
    });
  } catch (error) {
    console.error("VS Code device registration failed:", error);
  }

  // 2. Upsert cumulative daily telemetry record
  const idempotencyKey = `${deviceId}:${todayDate}`;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/usage_daily?on_conflict=user_id,device_id,usage_date,idempotency_key`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        user_id: userId,
        device_id: deviceId,
        usage_date: todayDate,
        method_id: daily.profileId || "mixed",
        sequence: 1,
        prompt_count: 0,
        input_tokens_est: daily.inputTokens,
        output_tokens_est: daily.outputTokens,
        energy_wh: daily.energyWh,
        water_ml_low: daily.lowTotalWaterMl,
        water_ml_mid: daily.totalWaterMl,
        water_ml_high: daily.highTotalWaterMl,
        carbon_g: daily.carbonGrams,
        confidence: "medium",
        idempotency_key: idempotencyKey
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase REST error: ${errText}`);
  }
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function emptyEstimate(): UsageEstimate {
  return {
    carbonGrams: 0,
    directWaterMl: 0,
    energyWh: 0,
    highTotalWaterMl: 0,
    indirectGridWaterMl: 0,
    inputTokens: 0,
    lowTotalWaterMl: 0,
    outputTokens: 0,
    profileId: "mixed",
    totalWaterMl: 0,
    weightedTokens: 0
  };
}
