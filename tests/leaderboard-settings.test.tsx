// @ts-nocheck
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { LeaderboardSettings } from "../web-app/src/components/LeaderboardSettings";

// Tell React we are in a testing environment that supports act()
global.IS_REACT_ACT_ENVIRONMENT = true;

describe("LeaderboardSettings Component", () => {
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

  it("disables display name input and save button when in Mock Mode", async () => {
    const mockSetOptedInName = jest.fn();
    const mockHandleSave = jest.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <LeaderboardSettings
          optedInName="Reiji"
          setOptedInName={mockSetOptedInName}
          isMockMode={true}
          handleSaveLeaderboardName={mockHandleSave}
        />
      );
    });

    const input = container!.querySelector("input") as HTMLInputElement;
    const button = container!.querySelector("button") as HTMLButtonElement;

    expect(input).toBeDefined();
    expect(button).toBeDefined();
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it("enables input and button and responds to events when in active session mode", async () => {
    const mockSetOptedInName = jest.fn();
    const mockHandleSave = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <LeaderboardSettings
          optedInName="Reiji"
          setOptedInName={mockSetOptedInName}
          isMockMode={false}
          handleSaveLeaderboardName={mockHandleSave}
        />
      );
    });

    const input = container!.querySelector("input") as HTMLInputElement;
    const button = container!.querySelector("button") as HTMLButtonElement;

    expect(input.disabled).toBe(false);
    expect(button.disabled).toBe(false);

    // Simulate typing by bypassing React's internal value tracker
    await act(async () => {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeValueSetter?.call(input, "Reiji Sakamoto");

      const event = new window.Event("input", { bubbles: true });
      input.dispatchEvent(event);
    });

    expect(mockSetOptedInName).toHaveBeenCalledWith("Reiji Sakamoto");

    // Test button click action trigger
    await act(async () => {
      button.click();
    });

    expect(mockHandleSave).toHaveBeenCalled();
  });
});
