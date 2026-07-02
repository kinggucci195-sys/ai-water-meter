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
      ? `$(beaker) ${formatMilliliters(usage.totalWaterMl)} today`
      : "$(beaker) AI Water Meter";
    statusBar.tooltip = usage
      ? `Estimated locally: ${formatWh(usage.energyWh)}, ${formatCarbon(usage.carbonGrams)}`
      : "Estimate selected AI text locally.";
    statusBar.show();
  };

  context.subscriptions.push(
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
    vscode.commands.registerCommand("aiWaterMeter.openMethodology", () => {
      void vscode.env.openExternal(
        vscode.Uri.parse("https://github.com/kinggucci195-sys/ai-water-meter/blob/main/DATASET.md")
      );
    })
  );

  await refreshStatus();
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
  vscode.window.showInformationMessage(
    `Estimated ${formatMilliliters(estimate.totalWaterMl)} for this text. Local only.`
  );
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
