// Background service worker for Omair's Form Filler

console.log('Omairs Form Filler: Background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');

    // Initialize storage
    chrome.storage.local.set({
      profiles: [],
      settings: {
        theme: 'dark',
        autoScroll: true,
        highlightElements: true
      }
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.action === 'getProfiles') {
    chrome.storage.local.get(['profiles'], (result) => {
      sendResponse({ profiles: result.profiles || [] });
    });
    return true;
  }

  if (message.action === 'saveProfile') {
    chrome.storage.local.get(['profiles'], (result) => {
      const profiles = result.profiles || [];
      profiles.push(message.profile);

      chrome.storage.local.set({ profiles: profiles }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'deleteProfile') {
    chrome.storage.local.get(['profiles'], (result) => {
      const profiles = result.profiles || [];
      const filtered = profiles.filter(p => p.id !== message.profileId);

      chrome.storage.local.set({ profiles: filtered }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  return false;
});

// Handle toolbar icon click (optional - opens popup by default)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.id);
});

// Listen for tab updates to maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tab.url);
  }
});

// Keyboard shortcut support (if added to manifest)
chrome.commands?.onCommand.addListener((command) => {
  console.log('Command received:', command);

  if (command === 'toggle-recording') {
    // Toggle recording state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleRecording' });
      }
    });
  }
});
