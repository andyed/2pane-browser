
// A map to store the state of the split view for each tab
const tabState = new Map();
// A map to track click timing for double-click detection
const clickState = new Map();

const DOUBLE_CLICK_THRESHOLD = 500; // ms

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const now = new Date().getTime();
  const lastClick = clickState.get(tabId) || 0;
  
  clickState.set(tabId, now);

  const isDoubleClick = (now - lastClick) < DOUBLE_CLICK_THRESHOLD;
  const paneCount = isDoubleClick ? 3 : 2;

  const isEnabled = tabState.get(tabId) || false;

  if (isEnabled) {
    // If it's enabled, send a message to the content script to disable it
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit" }, (response) => {
      if (chrome.runtime.lastError) {
        tabState.set(tabId, false);
      } else if (response && !response.isSplit) {
        tabState.set(tabId, false);
      }
    });
  } else {
    // If it's disabled, inject the content script and then send a message to enable it
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).then(() => {
      chrome.tabs.sendMessage(tabId, { action: "toggleSplit", paneCount: paneCount }, (response) => {
        if (response && response.isSplit) {
          tabState.set(tabId, true);
        }
      });
    }).catch(err => console.error("Failed to inject script: ", err));
  }
});
