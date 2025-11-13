// Simple Form Filler - Records and replays form interactions
console.log('Form Filler Ready');

let isRecording = false;
let actions = [];
let elementTracker = new WeakMap(); // Track unique element instances
let elementCounter = 0;

// Listen for commands from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startRecording') {
    startRecording();
    sendResponse({ success: true });
  }
  else if (msg.action === 'stopRecording') {
    const recordedActions = stopRecording();
    sendResponse({ success: true, actions: recordedActions });
  }
  else if (msg.action === 'fillForm') {
    fillForm(msg.actions);
    sendResponse({ success: true });
  }
  else if (msg.action === 'getRecordingState') {
    sendResponse({ isRecording: isRecording, actionCount: actions.length });
  }
  return true;
});

// Start recording
function startRecording() {
  isRecording = true;
  actions = [];
  elementTracker = new WeakMap();
  elementCounter = 0;

  document.addEventListener('click', recordClick, true);
  document.addEventListener('input', recordInput, true);
  document.addEventListener('change', recordChange, true);

  showNotification('Recording...', '#ef4444');
}

// Stop recording
function stopRecording() {
  isRecording = false;

  document.removeEventListener('click', recordClick, true);
  document.removeEventListener('input', recordInput, true);
  document.removeEventListener('change', recordChange, true);

  hideNotification();
  return actions;
}

// Record click events
function recordClick(e) {
  if (!isRecording) return;

  const el = e.target;
  const selector = getSelector(el);

  actions.push({
    type: 'click',
    selector: selector,
    tagName: el.tagName,
    inputType: el.type,
    checked: el.checked,
    text: el.innerText?.substring(0, 50)
  });

  flashElement(el);
}

// Record text input - FIXED to prevent merging
function recordInput(e) {
  if (!isRecording) return;

  const el = e.target;
  const selector = getSelector(el);

  // Get unique tracking ID for this element instance
  if (!elementTracker.has(el)) {
    elementTracker.set(el, ++elementCounter);
  }
  const elementId = elementTracker.get(el);

  // Only update if LAST action was THIS EXACT element (debounce typing in same field)
  const lastAction = actions[actions.length - 1];
  const isLastActionSameElement = lastAction &&
                                   lastAction.type === 'input' &&
                                   lastAction.elementId === elementId;

  const action = {
    type: 'input',
    selector: selector,
    elementId: elementId,  // Track element instance
    tagName: el.tagName,
    inputType: el.type,
    value: el.value
  };

  if (isLastActionSameElement) {
    // Update the last action (debounce continuous typing)
    actions[actions.length - 1] = action;
  } else {
    // New element, add new action
    actions.push(action);
  }
}

// Record select/checkbox/radio changes
function recordChange(e) {
  if (!isRecording) return;

  const el = e.target;
  const selector = getSelector(el);

  actions.push({
    type: 'change',
    selector: selector,
    tagName: el.tagName,
    inputType: el.type,
    value: el.value,
    checked: el.checked,
    selectedIndex: el.selectedIndex
  });

  flashElement(el);
}

// Get unique selector for element - IMPROVED
function getSelector(el) {
  // Try ID first (most reliable)
  if (el.id) return `#${el.id}`;

  // Try name with proper positioning
  if (el.name) {
    let sel = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    if (el.type) sel += `[type="${el.type}"]`;

    // Check if multiple elements match this selector
    const matches = document.querySelectorAll(sel);
    if (matches.length > 1) {
      // Find position among matches
      const idx = Array.from(matches).indexOf(el);
      // Use :nth-child for better uniqueness
      sel = `${sel}:nth-of-type(${idx + 1})`;
    }
    return sel;
  }

  // Build detailed DOM path as fallback
  return buildDomPath(el);
}

// Build detailed DOM path
function buildDomPath(el) {
  const path = [];
  let current = el;

  // Go up to 10 levels for better uniqueness
  for (let i = 0; i < 10 && current && current.tagName; i++) {
    let tag = current.tagName.toLowerCase();

    // Add ID if present
    if (current.id) {
      path.unshift(`${tag}#${current.id}`);
      break; // ID is unique, stop here
    }

    // Add class if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) {
        tag += `.${classes}`;
      }
    }

    // Add position among siblings of same tag
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children)
        .filter(e => e.tagName === current.tagName);

      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        tag += `:nth-of-type(${idx})`;
      }
    }

    path.unshift(tag);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Replay recorded actions
async function fillForm(recordedActions) {
  if (!recordedActions || recordedActions.length === 0) return;

  showNotification('Filling form...', '#6366f1');

  for (const action of recordedActions) {
    try {
      const el = document.querySelector(action.selector);

      if (!el) {
        console.warn('Element not found:', action.selector);
        continue;
      }

      // Scroll to element smoothly
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);

      // Single clean flash
      flashElement(el);
      await sleep(150);

      // Perform action
      if (action.type === 'input') {
        el.value = action.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      else if (action.type === 'click') {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = action.checked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.click();
        }
      }
      else if (action.type === 'change') {
        if (el.tagName === 'SELECT') {
          // Set both value and index for compatibility
          el.value = action.value;
          el.selectedIndex = action.selectedIndex;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = action.checked;
        } else {
          el.value = action.value;
        }
        // Dispatch both input and change for framework compatibility
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await sleep(250);

    } catch (err) {
      console.error('Error replaying action:', err);
    }
  }

  hideNotification();
}

// Utilities
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function flashElement(el) {
  const original = el.style.outline;
  el.style.outline = '3px solid #6366f1';
  setTimeout(() => el.style.outline = original, 350);
}

function showNotification(text, color) {
  hideNotification();

  const note = document.createElement('div');
  note.id = 'form-filler-notification';
  note.textContent = text;
  note.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(note);
}

function hideNotification() {
  const note = document.getElementById('form-filler-notification');
  if (note) note.remove();
}
