const BADGE_BG = "#4A6469"; // muted ink-teal — idle count badge
const BADGE_FLASH = "#B8862E"; // seal gold — momentary success flash, same as the in-popup stamp

async function syncBadgeFromStorage() {
  const { history = [] } = await chrome.storage.local.get("history");
  chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
  chrome.action.setBadgeText({ text: history.length ? String(history.length) : "" });
}

chrome.runtime.onInstalled.addListener(syncBadgeFromStorage);
chrome.runtime.onStartup.addListener(syncBadgeFromStorage);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.history) {
    syncBadgeFromStorage();
  }
});

// Popup asks for a brief gold "success" flash on generate, then
// the badge reverts to the idle history count.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "flash-badge") {
    chrome.action.setBadgeBackgroundColor({ color: BADGE_FLASH });
    chrome.action.setBadgeText({ text: "✓" });
    setTimeout(syncBadgeFromStorage, 1100);
  }
});
