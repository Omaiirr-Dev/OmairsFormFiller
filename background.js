// Simple background service worker

console.log('Omairs Form Filler: Background loaded');

// Initialize storage on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    chrome.storage.local.set({ profiles: [] });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});
