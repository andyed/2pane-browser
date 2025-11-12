if (window.hasRun2Pane) {
  // The script has already been injected and is active.
  // The existing script will handle any new messages.
} else {
  window.hasRun2Pane = true;

  let isSplit = false;
  let originalBodyStyle = {};
  let container;
  let frames = [];
  let frameWindows = [];

  // Listen for messages from the background script to toggle the view
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSplit") {
      if (isSplit) {
        removeSplitView();
      } else {
        // Handle view creation asynchronously to check settings first
        handleCreateSplitView(request.paneCount || 2);
      }
      sendResponse({ received: true });
    }
    return true; // Keep the message channel open for async responses
  });

  // Listen for navigation messages from the iframes
  window.addEventListener('message', async (event) => {
    // Check for our specific message format
    if (event.source && event.data && event.data.type === '2pane-navigate') {
      console.log('2Pane: Navigation message received for URL:', event.data.url);
      
      // Check if the new URL should be multipane
      const settings = await chrome.storage.sync.get(['urlMemory', 'autoSplitRules']);
      const urlMemory = settings.urlMemory || {};
      const autoSplitRules = settings.autoSplitRules || [];
      
      const targetUrl = event.data.url;
      let shouldBeMultipane = false;
      
      // Check if URL is in memory
      if (urlMemory[targetUrl]) {
        shouldBeMultipane = true;
      } else {
        // Check if URL matches any auto-split rules
        const matchedRule = autoSplitRules.find(rule => targetUrl.includes(rule));
        if (matchedRule) {
          shouldBeMultipane = true;
        }
      }
      
      if (shouldBeMultipane && frames && frames.length > 0) {
        // Keep multipane and navigate all frames
        console.log('2Pane: Target URL is configured for multipane, navigating frames');
        frames.forEach((frame, i) => {
          console.log(`2Pane: Setting frame ${i} src to: ${targetUrl}`);
          frame.src = targetUrl;
        });
      } else {
        // Fall back to single pane
        console.log('2Pane: Target URL not configured for multipane, falling back to single pane');
        
        // Clean up state BEFORE navigating to prevent message errors
        if (isSplit) {
          // Send state update immediately
          chrome.runtime.sendMessage({ type: 'splitState', isSplit: false });
          
          // Clean up the UI
          if (container) container.remove();
          document.body.style.overflow = originalBodyStyle.overflow;
          document.body.style.height = originalBodyStyle.height;
          frames = [];
          frameWindows = [];
          isSplit = false;
          
          // Remove from URL memory
          chrome.storage.sync.get('urlMemory', ({ urlMemory = {} }) => {
            delete urlMemory[window.location.href];
            chrome.storage.sync.set({ urlMemory });
          });
        }
        
        // Navigate the main page
        window.location.href = targetUrl;
      }
    }
  });

  async function handleCreateSplitView(paneCount) {
    const settings = await chrome.storage.sync.get({
      minWidthEnabled: false,
      minWidthValue: 1200
    });

    if (settings.minWidthEnabled && window.screen.width < settings.minWidthValue) {
      console.log(`2Pane: Screen width ${window.screen.width}px is less than minimum ${settings.minWidthValue}px. Aborting split view.`);
      // If we abort, we need to let the background script know that the state is not "split"
      chrome.runtime.sendMessage({ type: 'splitState', isSplit: false });
      return;
    }
    createSplitView(paneCount);
  }

  function createSplitView(paneCount) {
    if (isSplit) return;

    // --- Save state to storage ---
    chrome.storage.sync.get('urlMemory', ({ urlMemory = {} }) => {
      urlMemory[window.location.href] = paneCount;
      chrome.storage.sync.set({ urlMemory });
    });

    originalBodyStyle.overflow = document.body.style.overflow;
    originalBodyStyle.height = document.body.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    container = document.createElement('div');
    container.id = 'multi-pane-container';
    Object.assign(container.style, {
      display: 'flex',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '999999999'
    });

    const frameStyle = {
      flex: '1 1 ' + (100 / paneCount) + '%',
      width: (100 / paneCount) + '%',
      height: '100%',
      border: '1px solid #ccc'
    };

    let loadedCount = 0;
    const onFrameLoad = () => {
      loadedCount++;
      if (loadedCount === paneCount) {
        frameWindows = frames.map(f => f.contentWindow);
        setupScrollSync(paneCount);
      }
    };

    const injectScript = (frame) => {
      try {
        const script = frame.contentDocument.createElement('script');
        script.src = chrome.runtime.getURL('iframe_script.js');
        frame.contentDocument.body.appendChild(script);
      } catch (e) {
        console.error("2Pane: Failed to inject script into frame.", e);
      }
    };

    for (let i = 0; i < paneCount; i++) {
      const frame = document.createElement('iframe');
      Object.assign(frame.style, frameStyle);
      frame.src = window.location.href;
      
      frame.onload = () => {
        if (i > 0) {
          const paneHeight = frames[0].clientHeight;
          frame.contentWindow.scrollTo(0, i * paneHeight);
        }
        injectScript(frame);
        onFrameLoad();
      };

      frames.push(frame);
      container.appendChild(frame);
    }

    document.body.appendChild(container);
    isSplit = true;
    chrome.runtime.sendMessage({ type: 'splitState', isSplit: true });
  }

  function removeSplitView() {
    if (!isSplit) return;

    chrome.storage.sync.get('urlMemory', ({ urlMemory = {} }) => {
      delete urlMemory[window.location.href];
      chrome.storage.sync.set({ urlMemory });
    });

    if (container) container.remove();

    document.body.style.overflow = originalBodyStyle.overflow;
    document.body.style.height = originalBodyStyle.height;

    frames = [];
    frameWindows = [];

    isSplit = false;
    chrome.runtime.sendMessage({ type: 'splitState', isSplit: false });
  }

  let isSyncing = false;

  function setupScrollSync(paneCount) {
    const paneHeight = frames[0].clientHeight;

    frameWindows.forEach((frameWindow, i) => {
      frameWindow.addEventListener('scroll', () => {
        if (isSyncing) return;
        isSyncing = true;
        
        const masterScrollTop = frameWindow.scrollY - (i * paneHeight);

        requestAnimationFrame(() => {
          frameWindows.forEach((otherFrameWindow, j) => {
            if (i === j) return;

            const targetScrollTop = masterScrollTop + (j * paneHeight);
            
            const minScrollTop = j * paneHeight;
            if (targetScrollTop < minScrollTop) {
              otherFrameWindow.scrollTo(0, minScrollTop);
            } else {
              otherFrameWindow.scrollTo(0, targetScrollTop);
            }
          });
          isSyncing = false;
        });
      });
    });
  }
}
