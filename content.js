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

  // Capture text content for dropdown options
  const textContent = el.innerText || el.textContent || '';
  const trimmedText = textContent.trim().substring(0, 100);

  actions.push({
    type: 'click',
    selector: selector,
    tagName: el.tagName,
    inputType: el.type,
    checked: el.checked,
    text: trimmedText,
    value: el.value || trimmedText  // Use text as value for custom dropdowns
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

  // For SELECT elements, also capture the selected option text
  let displayText = el.value;
  if (el.tagName === 'SELECT' && el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
    displayText = el.options[el.selectedIndex].text;
  }

  actions.push({
    type: 'change',
    selector: selector,
    tagName: el.tagName,
    inputType: el.type,
    value: el.value,
    displayText: displayText,  // Text content of selected option
    checked: el.checked,
    selectedIndex: el.selectedIndex
  });

  flashElement(el);
}

// Get unique selector for element - SIMPLIFIED like working form fillers
function getSelector(el) {
  // Try ID first (most reliable)
  if (el.id) return `#${el.id}`;

  // Try name for form inputs
  if (el.name && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
    let sel = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    if (el.type) sel += `[type="${el.type}"]`;

    const matches = document.querySelectorAll(sel);
    if (matches.length > 1) {
      const idx = Array.from(matches).indexOf(el);
      sel = `${sel}:nth-of-type(${idx + 1})`;
    }
    return sel;
  }

  // Build pure nth-child path like working form fillers
  return buildNthChildPath(el);
}

// Build pure nth-child path (like: div:nth-child(5) > div > div > div:nth-child(2) > div)
function buildNthChildPath(el) {
  const path = [];
  let current = el;

  // Go up to 12 levels for better uniqueness
  for (let i = 0; i < 12 && current && current.tagName && current !== document.body; i++) {
    let tag = current.tagName.toLowerCase();

    // Stop at ID
    if (current.id) {
      path.unshift(`${tag}#${current.id}`);
      break;
    }

    // Add nth-child position
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        tag += `:nth-child(${idx})`;
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

      // Scroll to element quickly
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(100);

      // Quick flash
      flashElement(el);
      await sleep(80);

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
          // Real select element
          el.value = action.value;
          if (action.selectedIndex !== undefined) {
            el.selectedIndex = action.selectedIndex;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = action.checked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Custom dropdown (div-based) - click it and try to select option
          el.click();
          await sleep(100);

          // Try to find and click the option with matching text
          const searchText = action.displayText || action.value;
          if (searchText) {
            const option = findOptionByText(el, searchText);
            if (option) {
              option.click();
              await sleep(50);
            } else {
              // Fallback: try setting value directly
              el.value = action.value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      }

      await sleep(120);

    } catch (err) {
      console.error('Error replaying action:', err);
    }
  }

  hideNotification();
}

// Find dropdown option by text content
function findOptionByText(dropdownEl, text) {
  // Look for options in common dropdown patterns
  const selectors = [
    '[role="option"]',
    '[class*="option"]',
    '[class*="item"]',
    '[class*="menu-item"]',
    'li',
    'div[data-value]'
  ];

  for (const selector of selectors) {
    const options = document.querySelectorAll(selector);
    for (const opt of options) {
      if (opt.textContent.trim() === text || opt.textContent.includes(text)) {
        return opt;
      }
    }
  }

  return null;
}

// Utilities
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function flashElement(el) {
  const original = el.style.outline;
  el.style.outline = '3px solid #6366f1';
  setTimeout(() => el.style.outline = original, 250);
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
