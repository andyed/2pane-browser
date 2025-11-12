
window.addEventListener('DOMContentLoaded', () => {
  // Use event capturing to ensure our listener runs before others can stop propagation.
  document.body.addEventListener('click', (e) => {
    // Find the nearest anchor tag
    const anchor = e.target.closest('a');

    // Check for a valid href and that it's not a javascript: link
    if (anchor && anchor.href && !anchor.href.toLowerCase().startsWith('javascript:')) {
      // Prevent the default navigation
      e.preventDefault();
      e.stopPropagation(); // Stop other listeners from firing.

      // Post the message to the parent window
      window.parent.postMessage({
        type: '2pane-navigate',
        url: anchor.href
      }, '*');
    }
  }, { capture: true }); // <-- Use capture mode
});
