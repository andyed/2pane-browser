# 2Pane Split Screen

2Pane Split Screen is a Chrome extension that splits your current browser tab into multiple vertical panes, creating a "super tall monitor" effect on a single screen. This allows you to view different parts of a long webpage simultaneously.

This extension was created with the help of an AI software engineering agent.

## Features

- **Multi-Pane View**: 
  - **Single-click** the extension icon to create a 2-pane view.
  - **Double-click** the extension icon to create a 3-pane view.
- **Synchronized Scrolling**: Scrolling in any pane scrolls all other panes to the corresponding position, maintaining a continuous view of the content.
- **Synchronized Navigation**: Clicking a link in any pane will cause all panes to navigate to the new page, keeping them perfectly in sync.
- **Bypass Framing Restrictions**: Utilizes advanced extension APIs to display pages even if they use `X-Frame-Options` to prevent embedding.
- **URL Memory**: The extension remembers your preferred pane layout (2 or 3 panes) for specific URLs and automatically reinstates it when you revisit those pages.
- **Configurable Auto-Split Rules**: Define URL fragments that will always trigger a 2-pane view automatically when matched.
- **Minimum Width Trigger**: Optionally, configure the extension to only auto-split if your screen width exceeds a specified pixel value.

## How to Install

Since this is an unpacked extension, you can load it directly into a Chromium-based browser (like Google Chrome, Brave, or Edge) by following these steps:

1.  Navigate to `chrome://extensions` in your browser.
2.  Enable **Developer mode** using the toggle switch, usually found in the top-right corner.
3.  Click the **Load unpacked** button.
4.  In the file selection dialog, choose the root directory of this project (the `2pane` folder).
5.  The extension will be installed and ready to use. You may need to accept additional permissions upon installation due to the powerful APIs required.

## How to Use

1.  Navigate to any webpage you'd like to split.
2.  **For a 2-pane view**: Single-click the extension's icon in your browser toolbar.
3.  **For a 3-pane view**: Double-click the extension's icon.
4.  To close the split view, simply click the extension icon again (either single or double-click works).

## Options

To configure the extension's advanced features:

1.  Right-click the extension's icon in your browser toolbar.
2.  Select **Options**.
3.  Here you can:
    *   **Auto-Split Rules**: Enter URL fragments (e.g., `/docs`, `example.com/blog`) one per line. If a page's URL contains any of these fragments, it will automatically open in a 2-pane view.
    *   **Minimum Width Trigger**: Enable this option and specify a pixel width. The extension will only auto-split (from URL memory or auto-split rules) if your screen is wider than this value. This prevents unwanted splits on smaller screens.
    *   Click **Save** to apply your changes.

## Why isn't this in the Chrome Web Store?

This extension requires powerful permissions, including the ability to run on all sites and modify certain response headers, in order to reliably provide the multi-pane view and work around framing restrictions. Those capabilities are integral to the core functionality rather than optional extras.

Because of the sensitivity of these permissions and the potential review and policy complexities around them, the current plan is **not** to publish this extension to the Chrome Web Store or any other browser web store. Instead, it is intended to be installed as an unpacked extension by users who are comfortable reviewing the source and granting the necessary permissions.
