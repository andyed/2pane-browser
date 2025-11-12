
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
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit" });
  } else {
    // If it's disabled, inject the content script and then send a message to enable it
    triggerSplitView(tabId, paneCount);
  }
});

// Listen for messages from content script to update our internal state
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.type === 'splitState') {
    if (sender.tab) {
      tabState.set(sender.tab.id, request.isSplit);
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Ensure the page is fully loaded and has a URL
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }

  // Don't auto-split if a view is already active in the tab
  if (tabState.get(tabId)) {
    return;
  }

  chrome.storage.sync.get(['urlMemory', 'autoSplitRules'], ({ urlMemory = {}, autoSplitRules = [] }) => {
    // Check URL memory first
    if (urlMemory[tab.url]) {
      triggerSplitView(tabId, urlMemory[tab.url]);
      return;
    }

    // Then check auto-split rules
    const matchedRule = autoSplitRules.find(rule => tab.url.includes(rule));
    if (matchedRule) {
      triggerSplitView(tabId, 2); // Default to 2 panes for auto-split rules
    }
  });
});

function triggerSplitView(tabId, paneCount) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"]
  }).then(() => {
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit", paneCount: paneCount });
  }).catch(err => {
    // This can happen on special pages like chrome://extensions
    if (!err.message.includes('Cannot access a chrome:// URL')) {
        console.error("Failed to inject script: ", err)
    }
  });
}
