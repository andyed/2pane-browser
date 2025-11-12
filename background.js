// Use session storage for state. It's async but persists across service worker restarts.
const clickState = new Map(); // Use a map to handle timeouts for each tab individually.
const DOUBLE_CLICK_THRESHOLD = 400; // ms

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  if (!tabId) return;

  if (clickState.has(tabId)) {
    // This is a double click
    clearTimeout(clickState.get(tabId));
    clickState.delete(tabId);
    handleDoubleClick(tab);
  } else {
    // This is a single click, wait to see if it becomes a double
    const timeout = setTimeout(() => {
      handleSingleClick(tab);
      clickState.delete(tabId);
    }, DOUBLE_CLICK_THRESHOLD);
    clickState.set(tabId, timeout);
  }
});

async function handleSingleClick(tab) {
  const tabStorage = await chrome.storage.session.get(tab.id.toString());
  const isEnabled = tabStorage[tab.id];
  if (isEnabled) {
    sendMessageWithRetry(tab.id, { action: "toggleSplit" });
  } else {
    triggerSplitView(tab.id, 2);
  }
}

async function handleDoubleClick(tab) {
  const tabStorage = await chrome.storage.session.get(tab.id.toString());
  const isEnabled = tabStorage[tab.id];
  if (isEnabled) {
    sendMessageWithRetry(tab.id, { action: "toggleSplit" });
  } else {
    triggerSplitView(tab.id, 3);
  }
}

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
    });
    sendMessageWithRetry(tabId, { action: "toggleSplit", paneCount: paneCount });
  } catch (err) {
    // If injection fails, unlock the state.
    await chrome.storage.session.set({ [tabId]: false });
    if (!err.message.includes('Cannot access a chrome:// URL') && !err.message.includes('No tab with id')) {
        console.error(`Failed to inject script into tab ${tabId}: `, err);
    }
  }
}

function sendMessageWithRetry(tabId, message, retries = 3) {
  chrome.tabs.sendMessage(tabId, message, function(response) {
    if (chrome.runtime.lastError && retries > 0) {
      console.warn(`2Pane: Message failed, retrying... (${retries} left)`);
      setTimeout(() => {
        sendMessageWithRetry(tabId, message, retries - 1);
      }, 100);
    } else if (chrome.runtime.lastError) {
      console.error(`2Pane: Message failed after multiple retries:`, chrome.runtime.lastError.message);
    }
  });
}