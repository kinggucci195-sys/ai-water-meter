chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    methodology: "modern-text-2026",
    privacyMode: "local-only"
  });
});
