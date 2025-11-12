// Use session storage for state. It's async but persists across service worker restarts.
// It's cleared when the browser session ends.

const clickState = new Map(); // For double-click detection, this can be in-memory.
const DOUBLE_CLICK_THRESHOLD = 500; // ms

// Make the listener async to handle await for storage.
chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  if (!tabId) return;

  const now = new Date().getTime();
  const lastClick = clickState.get(tabId) || 0;
  clickState.set(tabId, now);

  const isDoubleClick = (now - lastClick) < DOUBLE_CLICK_THRESHOLD;
  const paneCount = isDoubleClick ? 3 : 2;

  const tabStorage = await chrome.storage.session.get(tabId.toString());
  const isEnabled = tabStorage[tabId];

  if (isEnabled) {
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit" });
    // The content script will message back the final state.
  } else {
    triggerSplitView(tabId, paneCount);
  }
});

// The content script reports its state, which we store reliably.
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.type === 'splitState' && sender.tab) {
    chrome.storage.session.set({ [sender.tab.id]: request.isSplit });
  }
});

// Make the listener async to handle await for storage.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }

  const tabStorage = await chrome.storage.session.get(tabId.toString());
  if (tabStorage[tabId]) {
    return; // Already active or pending, don't auto-trigger.
  }

  const settings = await chrome.storage.sync.get(['urlMemory', 'autoSplitRules']);
  const urlMemory = settings.urlMemory || {};
  const autoSplitRules = settings.autoSplitRules || [];

  let paneCount = 0;
  if (urlMemory[tab.url]) {
    paneCount = urlMemory[tab.url];
  } else {
    const matchedRule = autoSplitRules.find(rule => tab.url.includes(rule));
    if (matchedRule) {
      paneCount = 2;
    }
  }

  if (paneCount > 0) {
    triggerSplitView(tabId, paneCount);
  }
});

async function triggerSplitView(tabId, paneCount) {
  // Final check to prevent race conditions.
  const tabStorage = await chrome.storage.session.get(tabId.toString());
  if (tabStorage[tabId]) {
    return;
  }
  // Set state immediately to act as a lock.
  await chrome.storage.session.set({ [tabId]: true });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
      // world: 'MAIN' // REMOVED: Default to ISOLATED world.
    });
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit", paneCount: paneCount });
  } catch (err) {
    // If injection fails, unlock the state.
    await chrome.storage.session.set({ [tabId]: false });
    if (!err.message.includes('Cannot access a chrome:// URL') && !err.message.includes('No tab with id')) {
        console.error(`Failed to inject script into tab ${tabId}: `, err);
    }
  }
}