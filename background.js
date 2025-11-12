
// A map to store the state of the split view for each tab
const tabState = new Map();

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const isEnabled = tabState.get(tabId) || false;

  if (isEnabled) {
    // If it's enabled, send a message to the content script to disable it
    chrome.tabs.sendMessage(tabId, { action: "toggleSplit" }, (response) => {
      if (chrome.runtime.lastError) {
        // This can happen if the content script is not injected, so we can just update the state
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
      chrome.tabs.sendMessage(tabId, { action: "toggleSplit" }, (response) => {
        if (response && response.isSplit) {
          tabState.set(tabId, true);
        }
      });
    }).catch(err => console.error("Failed to inject script: ", err));
  }
});
