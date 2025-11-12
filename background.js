
// A map to store the state of the split view for each tab.
// true = active, false/undefined = inactive.
const tabState = new Map();
// A map to track click timing for double-click detection.
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
    // If it's enabled, send a message to the content script to disable it.
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit" });
    // The content script will message back to confirm, but we can preemptively set state.
    tabState.set(tabId, false);
  } else {
    // If it's disabled, trigger the view.
    triggerSplitView(tabId, paneCount);
  }
});

// The content script will message back its state, which we'll use to keep our map in sync.
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.type === 'splitState' && sender.tab) {
    tabState.set(sender.tab.id, request.isSplit);
  }
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab is updated, we can reset its split state.
  if (changeInfo.status === 'loading') {
    tabState.delete(tabId);
  }

  // Ensure the page is fully loaded and has a URL before trying to auto-split.
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }

  chrome.storage.sync.get(['urlMemory', 'autoSplitRules'], ({ urlMemory = {}, autoSplitRules = [] }) => {
    let paneCount = 0;
    // Check URL memory first.
    if (urlMemory[tab.url]) {
      paneCount = urlMemory[tab.url];
    } else {
      // Then check auto-split rules.
      const matchedRule = autoSplitRules.find(rule => tab.url.includes(rule));
      if (matchedRule) {
        paneCount = 2; // Default to 2 panes for auto-split rules.
      }
    }

    if (paneCount > 0) {
      triggerSplitView(tabId, paneCount);
    }
  });
});

function triggerSplitView(tabId, paneCount) {
  // Check the state one last time to prevent race conditions.
  if (tabState.get(tabId)) {
    return;
  }
  // Set state immediately to 'true' to act as a lock.
  tabState.set(tabId, true);

  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"],
    world: 'MAIN' // Inject into the main world to share variables.
  }).then(() => {
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit", paneCount: paneCount });
  }).catch(err => {
    // If injection fails, unlock the state.
    tabState.set(tabId, false);
    if (!err.message.includes('Cannot access a chrome:// URL') && !err.message.includes('No tab with id')) {
        console.error(`Failed to inject script into tab ${tabId}: `, err);
    }
  });
}
