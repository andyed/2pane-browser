
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
      sendResponse({ isSplit: false });
    } else {
      createSplitView(request.paneCount || 2);
      sendResponse({ isSplit: true });
    }
  }
  // Return true to indicate an asynchronous response
  return true;
});

// Listen for navigation messages from the iframes
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === '2pane-navigate') {
    frames.forEach(frame => {
      frame.src = event.data.url;
    });
  }
});

function createSplitView(paneCount) {
  if (isSplit) return;

  // Save original body style
  originalBodyStyle.overflow = document.body.style.overflow;
  originalBodyStyle.height = document.body.style.height;
  
  // Hide original body content and prevent scrolling
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
      // This can fail if the iframe navigates to a cross-origin page before injection
      console.error("2Pane: Failed to inject script into frame.", e);
    }
  };

  for (let i = 0; i < paneCount; i++) {
    const frame = document.createElement('iframe');
    Object.assign(frame.style, frameStyle);
    frame.src = window.location.href;
    
    frame.onload = () => {
      // Set initial scroll for subsequent frames
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
}

function removeSplitView() {
  if (!isSplit) return;

  if (container) {
    container.remove();
  }

  // Restore original body style
  document.body.style.overflow = originalBodyStyle.overflow;
  document.body.style.height = originalBodyStyle.height;

  // Clear arrays
  frames = [];
  frameWindows = [];

  isSplit = false;
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
          if (i === j) return; // Don't rescroll the source frame

          const targetScrollTop = masterScrollTop + (j * paneHeight);
          
          // Prevent scrolling above the intended start point
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
