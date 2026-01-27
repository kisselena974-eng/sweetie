/**
 * Home Screen - Glucose Display
 * Shows current glucose level, graph, and context markers
 */

export function initHomeScreen() {
  const addContextBtn = document.querySelector('.add-context-btn');

  if (addContextBtn) {
    addContextBtn.addEventListener('click', handleAddContext);
  }
}

function handleAddContext() {
  console.log('Add context clicked - flow to be implemented');
  // TODO: Implement context flow (screens 2-5)
}
