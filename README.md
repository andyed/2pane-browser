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