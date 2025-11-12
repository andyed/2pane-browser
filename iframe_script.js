
window.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    // Find the nearest anchor tag
    const anchor = e.target.closest('a');

    if (anchor && anchor.href) {
      // Prevent the default navigation
      e.preventDefault();

      // Post the message to the parent window
      window.parent.postMessage({
        type: '2pane-navigate',
        url: anchor.href
      }, '*'); // Use a specific origin in a real product, but '*' is fine for this
    }
  });
});
