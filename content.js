// Content script for Omair's Form Filler
// This script runs on every page and captures/replays user interactions

let isRecording = false;
let recordedActions = [];
let actionCounter = 0;

// Visual feedback overlay
let recordingOverlay = null;
let replayOverlay = null;

// Initialize the content script
console.log('Omairs Form Filler: Content script loaded');

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  if (message.action === 'startRecording') {
    startRecording();
    sendResponse({ success: true });
  } else if (message.action === 'stopRecording') {
    const actions = stopRecording();
    sendResponse({ success: true, actions: actions });
  } else if (message.action === 'getRecordingStatus') {
    sendResponse({
      isRecording: isRecording,
      actionCount: recordedActions.length
    });
  } else if (message.action === 'fillForm') {
    fillForm(message.actions);
    sendResponse({ success: true });
  } else if (message.action === 'ping') {
    sendResponse({ success: true });
  }

  return true; // Keep channel open for async response
});

// Start recording user interactions
function startRecording() {
  if (isRecording) return;

  isRecording = true;
  recordedActions = [];
  actionCounter = 0;

  console.log('Recording started');
  showRecordingOverlay();

  // Add event listeners for all interaction types
  document.addEventListener('click', captureClick, true);
  document.addEventListener('input', captureInput, true);
  document.addEventListener('change', captureChange, true);
  document.addEventListener('submit', captureSubmit, true);
}

// Stop recording
function stopRecording() {
  if (!isRecording) return [];

  isRecording = false;

  console.log('Recording stopped. Actions captured:', recordedActions.length);
  hideRecordingOverlay();

  // Remove event listeners
  document.removeEventListener('click', captureClick, true);
  document.removeEventListener('input', captureInput, true);
  document.removeEventListener('change', captureChange, true);
  document.removeEventListener('submit', captureSubmit, true);

  return [...recordedActions];
}

// Capture click events
function captureClick(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip clicks on the recording overlay
  if (element.closest('.omairs-form-filler-overlay')) return;

  const action = {
    id: ++actionCounter,
    type: 'click',
    timestamp: Date.now(),
    selector: getUniqueSelector(element),
    elementType: element.tagName.toLowerCase(),
    elementText: element.innerText?.substring(0, 50) || '',
    elementValue: element.value || '',
    elementName: element.name || '',
    elementId: element.id || '',
    checked: element.checked,
    url: window.location.href
  };

  // Special handling for radio buttons and checkboxes
  if (element.type === 'radio' || element.type === 'checkbox') {
    action.checked = element.checked;
  }

  recordedActions.push(action);
  console.log('Captured click:', action);

  // Visual feedback
  highlightElement(element);
  updateRecordingCounter();
}

// Capture input events (text fields, textareas)
function captureInput(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip if not an input element
  if (!['INPUT', 'TEXTAREA'].includes(element.tagName)) return;

  // Debounce rapid input events for the same element
  const existingActionIndex = recordedActions.findIndex(
    a => a.selector === getUniqueSelector(element) && a.type === 'input'
  );

  const action = {
    id: existingActionIndex >= 0 ? recordedActions[existingActionIndex].id : ++actionCounter,
    type: 'input',
    timestamp: Date.now(),
    selector: getUniqueSelector(element),
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || 'text',
    elementName: element.name || '',
    elementId: element.id || '',
    value: element.value,
    url: window.location.href
  };

  if (existingActionIndex >= 0) {
    // Update existing action
    recordedActions[existingActionIndex] = action;
  } else {
    // Add new action
    recordedActions.push(action);
  }

  console.log('Captured input:', action);
  updateRecordingCounter();
}

// Capture change events (dropdowns, file inputs, etc.)
function captureChange(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip if not a form element
  if (!['SELECT', 'INPUT'].includes(element.tagName)) return;

  const action = {
    id: ++actionCounter,
    type: 'change',
    timestamp: Date.now(),
    selector: getUniqueSelector(element),
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || '',
    elementName: element.name || '',
    elementId: element.id || '',
    value: element.value,
    selectedIndex: element.selectedIndex,
    selectedOptions: element.selectedOptions ? Array.from(element.selectedOptions).map(o => o.value) : [],
    checked: element.checked,
    url: window.location.href
  };

  // For select elements, capture the selected option
  if (element.tagName === 'SELECT') {
    action.selectedText = element.options[element.selectedIndex]?.text || '';
  }

  recordedActions.push(action);
  console.log('Captured change:', action);

  highlightElement(element);
  updateRecordingCounter();
}

// Capture form submit events
function captureSubmit(event) {
  if (!isRecording) return;

  const element = event.target;

  const action = {
    id: ++actionCounter,
    type: 'submit',
    timestamp: Date.now(),
    selector: getUniqueSelector(element),
    elementType: element.tagName.toLowerCase(),
    elementId: element.id || '',
    elementName: element.name || '',
    url: window.location.href
  };

  recordedActions.push(action);
  console.log('Captured submit:', action);

  highlightElement(element);
  updateRecordingCounter();
}

// Generate a unique selector for an element
function getUniqueSelector(element) {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try name attribute
  if (element.name) {
    const tagName = element.tagName.toLowerCase();
    const name = element.name;
    const type = element.type ? `[type="${element.type}"]` : '';
    return `${tagName}[name="${name}"]${type}`;
  }

  // Try data attributes
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${attr.value}"]`)
    .join('');

  if (dataAttrs) {
    return `${element.tagName.toLowerCase()}${dataAttrs}`;
  }

  // Build path from root
  const path = [];
  let currentElement = element;

  while (currentElement && currentElement.tagName) {
    let selector = currentElement.tagName.toLowerCase();

    // Add class if available
    if (currentElement.className && typeof currentElement.className === 'string') {
      const classes = currentElement.className.trim().split(/\s+/).filter(c => c && !c.startsWith('omairs-'));
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    if (currentElement.parentElement) {
      const siblings = Array.from(currentElement.parentElement.children).filter(
        el => el.tagName === currentElement.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElement) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    currentElement = currentElement.parentElement;

    // Stop at body or after 5 levels
    if (!currentElement || currentElement.tagName === 'BODY' || path.length >= 5) {
      break;
    }
  }

  return path.join(' > ');
}

// Find element by selector with fallback strategies
function findElement(selector) {
  try {
    // Try direct selector first
    let element = document.querySelector(selector);
    if (element) return element;

    // Try without nth-of-type
    const withoutNth = selector.replace(/:nth-of-type\(\d+\)/g, '');
    element = document.querySelector(withoutNth);
    if (element) return element;

    // Try just the last part of the selector
    const parts = selector.split('>').map(p => p.trim());
    if (parts.length > 1) {
      element = document.querySelector(parts[parts.length - 1]);
      if (element) return element;
    }

    return null;
  } catch (error) {
    console.error('Error finding element:', selector, error);
    return null;
  }
}

// Fill form with recorded actions
async function fillForm(actions) {
  if (!actions || actions.length === 0) {
    console.log('No actions to replay');
    return;
  }

  console.log('Starting form fill with', actions.length, 'actions');
  showReplayOverlay();

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`Replaying action ${i + 1}/${actions.length}:`, action);

    try {
      const element = findElement(action.selector);

      if (!element) {
        console.warn('Element not found for action:', action);
        continue;
      }

      // Highlight element being interacted with
      highlightElement(element, '#6366f1');

      // Wait a bit for visual feedback
      await sleep(300);

      // Replay the action based on type
      switch (action.type) {
        case 'input':
          if (element.value !== action.value) {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;

        case 'click':
          if (action.checked !== undefined && element.type === 'checkbox') {
            element.checked = action.checked;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (action.checked !== undefined && element.type === 'radio') {
            element.checked = true;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.click();
          }
          break;

        case 'change':
          if (element.tagName === 'SELECT') {
            if (action.selectedIndex !== undefined) {
              element.selectedIndex = action.selectedIndex;
            } else if (action.value !== undefined) {
              element.value = action.value;
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = action.checked;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.value = action.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;

        case 'submit':
          // Don't auto-submit, just highlight
          console.log('Submit action detected, but not executing to prevent accidental submission');
          break;
      }

      updateReplayCounter(i + 1, actions.length);

    } catch (error) {
      console.error('Error replaying action:', action, error);
    }
  }

  console.log('Form fill complete');

  // Hide overlay after a delay
  setTimeout(() => {
    hideReplayOverlay();
  }, 2000);
}

// Highlight an element temporarily
function highlightElement(element, color = '#ef4444') {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;

  element.style.outline = `3px solid ${color}`;
  element.style.outlineOffset = '2px';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
  }, 500);
}

// Show recording overlay
function showRecordingOverlay() {
  if (recordingOverlay) return;

  recordingOverlay = document.createElement('div');
  recordingOverlay.className = 'omairs-form-filler-overlay';
  recordingOverlay.innerHTML = `
    <div class="omairs-overlay-content">
      <div class="omairs-overlay-icon">⏺</div>
      <div class="omairs-overlay-text">Recording</div>
      <div class="omairs-overlay-counter">0 actions</div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .omairs-form-filler-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: rgba(239, 68, 68, 0.95);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(10px);
      animation: omairs-slide-in 0.3s ease;
      pointer-events: none;
    }

    .omairs-overlay-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .omairs-overlay-icon {
      font-size: 20px;
      animation: omairs-pulse 2s infinite;
    }

    .omairs-overlay-text {
      font-weight: 600;
      font-size: 14px;
    }

    .omairs-overlay-counter {
      font-size: 12px;
      opacity: 0.9;
      margin-left: 4px;
    }

    @keyframes omairs-slide-in {
      from {
        transform: translateX(100px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes omairs-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(recordingOverlay);
}

// Hide recording overlay
function hideRecordingOverlay() {
  if (recordingOverlay) {
    recordingOverlay.style.animation = 'omairs-slide-out 0.3s ease';
    setTimeout(() => {
      recordingOverlay?.remove();
      recordingOverlay = null;
    }, 300);
  }
}

// Update recording counter
function updateRecordingCounter() {
  if (recordingOverlay) {
    const counter = recordingOverlay.querySelector('.omairs-overlay-counter');
    if (counter) {
      const uniqueActions = new Set(recordedActions.map(a => a.id)).size;
      counter.textContent = `${uniqueActions} action${uniqueActions !== 1 ? 's' : ''}`;
    }
  }
}

// Show replay overlay
function showReplayOverlay() {
  if (replayOverlay) return;

  replayOverlay = document.createElement('div');
  replayOverlay.className = 'omairs-form-filler-overlay';
  replayOverlay.style.background = 'rgba(99, 102, 241, 0.95)';
  replayOverlay.innerHTML = `
    <div class="omairs-overlay-content">
      <div class="omairs-overlay-icon">▶️</div>
      <div class="omairs-overlay-text">Filling Form</div>
      <div class="omairs-overlay-counter">0/0</div>
    </div>
  `;

  document.body.appendChild(replayOverlay);
}

// Hide replay overlay
function hideReplayOverlay() {
  if (replayOverlay) {
    replayOverlay.style.animation = 'omairs-slide-out 0.3s ease';
    setTimeout(() => {
      replayOverlay?.remove();
      replayOverlay = null;
    }, 300);
  }
}

// Update replay counter
function updateReplayCounter(current, total) {
  if (replayOverlay) {
    const counter = replayOverlay.querySelector('.omairs-overlay-counter');
    if (counter) {
      counter.textContent = `${current}/${total}`;
    }
  }
}

// Utility: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
