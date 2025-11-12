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
  }
});

// Listen for navigation messages from the iframes
window.addEventListener('message', (event) => {
  // Check for our specific message format
  if (event.source && event.data && event.data.type === '2pane-navigate') {
    console.log('2Pane: Navigation message received for URL:', event.data.url);
    if (frames && frames.length > 0) {
      frames.forEach((frame, i) => {
        console.log(`2Pane: Setting frame ${i} src to: ${event.data.url}`);
        frame.src = event.data.url;
      });
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
    // Silently abort. The user doesn't need a notification for this.
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