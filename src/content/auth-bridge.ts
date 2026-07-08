// auth-bridge.ts
// This script runs in the MAIN world of the web app page and has direct access to the page's localStorage.
// It handles bidirectional session sync between the web app and the extension.

function sendAuthToExtension() {
  try {
    const token = localStorage.getItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
    const mockEmail = localStorage.getItem("sb-mock-email");
    window.postMessage(
      {
        type: "AI_WATER_METER_AUTH_TRANSFER",
        token,
        mockEmail
      },
      "*"
    );
  } catch {
    // Ignore any security or access errors from sandboxed iframes
  }
}

// Listen for sign-out messages from the extension (isolated world)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "AI_WATER_METER_SIGN_OUT") {
    try {
      localStorage.removeItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
      localStorage.removeItem("sb-mock-email");
      window.location.reload();
    } catch {
      // Ignore
    }
  }
});

// Run immediately on page load
sendAuthToExtension();

// Poll every second to detect login/logout changes
setInterval(sendAuthToExtension, 1000);
