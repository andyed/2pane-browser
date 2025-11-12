let isSplit = false;
let originalBodyStyle = {};
let container;
let leftFrame, rightFrame;
let leftFrameWindow, rightFrameWindow;

// Listen for messages from the background script to toggle the view
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSplit") {
    if (isSplit) {
      removeSplitView();
    } else {
      createSplitView();
    }
    sendResponse({ isSplit: isSplit });
  }
});

// Listen for navigation messages from the iframes
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === '2pane-navigate') {
    if (leftFrame && rightFrame) {
      leftFrame.src = event.data.url;
      rightFrame.src = event.data.url;
    }
  }
});

function createSplitView() {
  if (isSplit) return;

  // Save original body style
  originalBodyStyle.overflow = document.body.style.overflow;
  originalBodyStyle.height = document.body.style.height;
  
  // Hide original body content and prevent scrolling
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';

  container = document.createElement('div');
  container.id = 'two-pane-container';
  Object.assign(container.style, {
    display: 'flex',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '999999999'
  });

  leftFrame = document.createElement('iframe');
  rightFrame = document.createElement('iframe');

  const frameStyle = {
    flex: '1 1 50%',
    width: '50%',
    height: '100%',
    border: '1px solid #ccc'
  };

  Object.assign(leftFrame.style, frameStyle);
  Object.assign(rightFrame.style, frameStyle);

  leftFrame.src = window.location.href;
  rightFrame.src = window.location.href;

  container.appendChild(leftFrame);
  container.appendChild(rightFrame);

  document.body.appendChild(container);

  let leftLoaded = false;
  let rightLoaded = false;

  const injectScript = (frame) => {
    const script = frame.contentDocument.createElement('script');
    script.src = chrome.runtime.getURL('iframe_script.js');
    frame.contentDocument.body.appendChild(script);
  };

  const onFrameLoad = () => {
    if (leftLoaded && rightLoaded) {
      leftFrameWindow = leftFrame.contentWindow;
      rightFrameWindow = rightFrame.contentWindow;
      setupScrollSync();
    }
  };

  leftFrame.onload = () => {
    leftLoaded = true;
    injectScript(leftFrame);
    onFrameLoad();
  };

  rightFrame.onload = () => {
    rightLoaded = true;
    // Set initial scroll for the right frame once it's loaded
    rightFrame.contentWindow.scrollTo(0, leftFrame.clientHeight);
    injectScript(rightFrame);
    onFrameLoad();
  };

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

  isSplit = false;
}

let isSyncing = false;

function setupScrollSync() {
    const onLeftScroll = () => {
        if (isSyncing) return;
        isSyncing = true;
        requestAnimationFrame(() => {
            rightFrameWindow.scrollTo(0, leftFrameWindow.scrollY + leftFrame.clientHeight);
            isSyncing = false;
        });
    };

    const onRightScroll = () => {
        if (isSyncing) return;
        isSyncing = true;
        requestAnimationFrame(() => {
            if (rightFrameWindow.scrollY < leftFrame.clientHeight) {
                rightFrameWindow.scrollTo(0, leftFrame.clientHeight);
            }
            leftFrameWindow.scrollTo(0, rightFrameWindow.scrollY - leftFrame.clientHeight);
            isSyncing = false;
        });
    };

    leftFrameWindow.addEventListener('scroll', onLeftScroll);
    rightFrameWindow.addEventListener('scroll', onRightScroll);

    // We need to remove these listeners when the view is removed, but the windows will be destroyed.
    // So, we don't need to explicitly remove them.
}