// Content script for Omair's Form Filler - Enhanced Version
// This script runs on every page and captures/replays user interactions with maximum robustness

let isRecording = false;
let recordedActions = [];
let actionCounter = 0;

// Visual feedback overlay
let recordingOverlay = null;
let replayOverlay = null;

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 500,
  ELEMENT_WAIT_TIMEOUT: 5000,
  ELEMENT_WAIT_INTERVAL: 100,
  REPLAY_DELAY: 400,
  HIGHLIGHT_DURATION: 600,
  SCROLL_BEHAVIOR: 'smooth'
};

// Initialize the content script
console.log('Omairs Form Filler: Enhanced content script loaded');

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
  document.addEventListener('focus', captureFocus, true);
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
  document.removeEventListener('focus', captureFocus, true);

  return [...recordedActions];
}

// Capture click events
function captureClick(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip clicks on the recording overlay
  if (element.closest('.omairs-form-filler-overlay')) return;

  // Get comprehensive element information
  const elementInfo = getElementInfo(element);

  const action = {
    id: ++actionCounter,
    type: 'click',
    timestamp: Date.now(),
    selector: elementInfo.selector,
    xpath: elementInfo.xpath,
    elementType: element.tagName.toLowerCase(),
    elementText: (element.innerText || element.textContent || '').substring(0, 100).trim(),
    elementValue: element.value || '',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClasses: elementInfo.classes,
    elementAttributes: elementInfo.attributes,
    checked: element.checked,
    href: element.href || '',
    url: window.location.href,
    position: elementInfo.position
  };

  // Special handling for radio buttons and checkboxes
  if (element.type === 'radio' || element.type === 'checkbox') {
    action.checked = element.checked;
    action.inputType = element.type;
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

  const elementInfo = getElementInfo(element);

  // Debounce rapid input events for the same element
  const existingActionIndex = recordedActions.findIndex(
    a => a.selector === elementInfo.selector && a.type === 'input'
  );

  const action = {
    id: existingActionIndex >= 0 ? recordedActions[existingActionIndex].id : ++actionCounter,
    type: 'input',
    timestamp: Date.now(),
    selector: elementInfo.selector,
    xpath: elementInfo.xpath,
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || 'text',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClasses: elementInfo.classes,
    elementAttributes: elementInfo.attributes,
    value: element.value,
    placeholder: element.placeholder || '',
    url: window.location.href,
    position: elementInfo.position
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

  const elementInfo = getElementInfo(element);

  const action = {
    id: ++actionCounter,
    type: 'change',
    timestamp: Date.now(),
    selector: elementInfo.selector,
    xpath: elementInfo.xpath,
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || '',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClasses: elementInfo.classes,
    elementAttributes: elementInfo.attributes,
    value: element.value,
    selectedIndex: element.selectedIndex,
    selectedOptions: element.selectedOptions ? Array.from(element.selectedOptions).map(o => ({
      value: o.value,
      text: o.text,
      index: o.index
    })) : [],
    checked: element.checked,
    url: window.location.href,
    position: elementInfo.position
  };

  // For select elements, capture the selected option
  if (element.tagName === 'SELECT') {
    action.selectedText = element.options[element.selectedIndex]?.text || '';
    action.allOptions = Array.from(element.options).map(o => ({
      value: o.value,
      text: o.text,
      index: o.index
    }));
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
  const elementInfo = getElementInfo(element);

  const action = {
    id: ++actionCounter,
    type: 'submit',
    timestamp: Date.now(),
    selector: elementInfo.selector,
    xpath: elementInfo.xpath,
    elementType: element.tagName.toLowerCase(),
    elementId: element.id || '',
    elementName: element.name || '',
    elementClasses: elementInfo.classes,
    url: window.location.href,
    position: elementInfo.position
  };

  recordedActions.push(action);
  console.log('Captured submit:', action);

  highlightElement(element);
  updateRecordingCounter();
}

// Capture focus events for better context
function captureFocus(event) {
  // This helps with forms that have complex validation or dynamic behavior
  // We don't save focus as an action, but it helps improve accuracy
}

// Get comprehensive element information
function getElementInfo(element) {
  const rect = element.getBoundingClientRect();

  return {
    selector: getUniqueSelector(element),
    xpath: getXPath(element),
    classes: element.className && typeof element.className === 'string'
      ? element.className.trim().split(/\s+/).filter(c => c && !c.startsWith('omairs-'))
      : [],
    attributes: getRelevantAttributes(element),
    position: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    }
  };
}

// Get relevant attributes for element identification
function getRelevantAttributes(element) {
  const attrs = {};
  const relevantAttrs = ['type', 'name', 'id', 'placeholder', 'aria-label', 'aria-labelledby',
                         'role', 'title', 'alt', 'value', 'href', 'data-testid', 'data-test',
                         'data-cy', 'data-automation', 'data-id'];

  relevantAttrs.forEach(attr => {
    if (element.hasAttribute(attr)) {
      attrs[attr] = element.getAttribute(attr);
    }
  });

  return attrs;
}

// Generate a unique CSS selector for an element with multiple strategies
function getUniqueSelector(element) {
  // Strategy 1: ID (most reliable if stable)
  if (element.id && !element.id.match(/^[0-9]/)) {
    return `#${CSS.escape(element.id)}`;
  }

  // Strategy 2: Name attribute with type
  if (element.name) {
    const tagName = element.tagName.toLowerCase();
    const name = CSS.escape(element.name);
    const type = element.type ? `[type="${element.type}"]` : '';
    const selector = `${tagName}[name="${name}"]${type}`;

    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Strategy 3: Data attributes (commonly used in modern frameworks)
  const dataAttrs = ['data-testid', 'data-test', 'data-cy', 'data-automation', 'data-id'];
  for (const attr of dataAttrs) {
    if (element.hasAttribute(attr)) {
      const value = CSS.escape(element.getAttribute(attr));
      const selector = `[${attr}="${value}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // Strategy 4: ARIA labels
  if (element.hasAttribute('aria-label')) {
    const label = CSS.escape(element.getAttribute('aria-label'));
    const selector = `${element.tagName.toLowerCase()}[aria-label="${label}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Strategy 5: Placeholder for inputs
  if (element.placeholder) {
    const placeholder = CSS.escape(element.placeholder);
    const selector = `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Strategy 6: Build path from root with smart class selection
  return buildSmartCSSPath(element);
}

// Build a smart CSS path
function buildSmartCSSPath(element) {
  const path = [];
  let currentElement = element;
  let depth = 0;
  const maxDepth = 6;

  while (currentElement && currentElement.tagName && depth < maxDepth) {
    let selector = currentElement.tagName.toLowerCase();

    // Add stable classes (avoid dynamic ones)
    if (currentElement.className && typeof currentElement.className === 'string') {
      const classes = currentElement.className.trim().split(/\s+/).filter(c => {
        // Filter out likely dynamic classes
        return c &&
               !c.startsWith('omairs-') &&
               !c.match(/^(active|selected|focus|hover|disabled|hidden|visible)$/i) &&
               !c.match(/\d{4,}/) && // Avoid classes with long numbers
               !c.match(/^_/); // Avoid CSS modules hashes
      });

      if (classes.length > 0 && classes.length <= 3) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    // Add position if needed for disambiguation
    if (currentElement.parentElement) {
      const siblings = Array.from(currentElement.parentElement.children);
      const sameTagSiblings = siblings.filter(el => {
        if (el.tagName !== currentElement.tagName) return false;
        if (currentElement.className) {
          return el.className === currentElement.className;
        }
        return true;
      });

      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(currentElement) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    currentElement = currentElement.parentElement;
    depth++;

    // Stop at body, form, or identifiable container
    if (!currentElement || currentElement.tagName === 'BODY' ||
        currentElement.tagName === 'FORM' || currentElement.id) {
      if (currentElement && currentElement.id) {
        path.unshift(`#${CSS.escape(currentElement.id)}`);
      }
      break;
    }
  }

  return path.join(' > ');
}

// Generate XPath for an element (fallback strategy)
function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const paths = [];
  let currentElement = element;

  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let hasFollowingSiblings = false;

    for (let sibling = currentElement.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === currentElement.nodeName) {
        index++;
      }
    }

    for (let sibling = currentElement.nextSibling; sibling; sibling = sibling.nextSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === currentElement.nodeName) {
        hasFollowingSiblings = true;
        break;
      }
    }

    const tagName = currentElement.nodeName.toLowerCase();
    const pathIndex = (index > 0 || hasFollowingSiblings) ? `[${index + 1}]` : '';
    paths.unshift(tagName + pathIndex);

    currentElement = currentElement.parentNode;

    if (currentElement && currentElement.nodeType === Node.DOCUMENT_NODE) {
      break;
    }
  }

  return paths.length ? '/' + paths.join('/') : '';
}

// Find element with multiple strategies and retries
async function findElement(action, retryCount = 0) {
  try {
    // Strategy 1: Direct CSS selector
    let element = document.querySelector(action.selector);
    if (element && isElementValid(element, action)) {
      return element;
    }

    // Strategy 2: XPath
    if (action.xpath) {
      element = document.evaluate(action.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (element && isElementValid(element, action)) {
        return element;
      }
    }

    // Strategy 3: By name and type
    if (action.elementName) {
      const nameSelector = `${action.elementType}[name="${action.elementName}"]`;
      element = document.querySelector(nameSelector);
      if (element && isElementValid(element, action)) {
        return element;
      }
    }

    // Strategy 4: By ID
    if (action.elementId) {
      element = document.getElementById(action.elementId);
      if (element && isElementValid(element, action)) {
        return element;
      }
    }

    // Strategy 5: By data attributes
    if (action.elementAttributes) {
      for (const [key, value] of Object.entries(action.elementAttributes)) {
        if (key.startsWith('data-')) {
          element = document.querySelector(`[${key}="${value}"]`);
          if (element && isElementValid(element, action)) {
            return element;
          }
        }
      }
    }

    // Strategy 6: By text content (for buttons, labels, etc.)
    if (action.elementText && action.elementText.length > 2) {
      const elements = document.querySelectorAll(action.elementType);
      for (const el of elements) {
        const text = (el.innerText || el.textContent || '').trim();
        if (text === action.elementText || text.includes(action.elementText)) {
          if (isElementValid(el, action)) {
            return el;
          }
        }
      }
    }

    // Strategy 7: By placeholder
    if (action.placeholder) {
      element = document.querySelector(`[placeholder="${action.placeholder}"]`);
      if (element && isElementValid(element, action)) {
        return element;
      }
    }

    // Strategy 8: Relaxed CSS selector (remove nth-of-type)
    const relaxedSelector = action.selector.replace(/:nth-of-type\(\d+\)/g, '');
    element = document.querySelector(relaxedSelector);
    if (element && isElementValid(element, action)) {
      return element;
    }

    // Strategy 9: Last part of selector only
    const parts = action.selector.split('>').map(p => p.trim());
    if (parts.length > 1) {
      element = document.querySelector(parts[parts.length - 1]);
      if (element && isElementValid(element, action)) {
        return element;
      }
    }

    // Retry with wait if element might not be loaded yet
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`Element not found, retrying... (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(CONFIG.RETRY_DELAY * (retryCount + 1));
      return await findElement(action, retryCount + 1);
    }

    return null;
  } catch (error) {
    console.error('Error finding element:', error);

    // Retry on error
    if (retryCount < CONFIG.MAX_RETRIES) {
      await sleep(CONFIG.RETRY_DELAY);
      return await findElement(action, retryCount + 1);
    }

    return null;
  }
}

// Validate if found element matches the action
function isElementValid(element, action) {
  if (!element) return false;

  // Check tag name
  if (element.tagName.toLowerCase() !== action.elementType.toLowerCase()) {
    return false;
  }

  // Check type for inputs
  if (action.inputType && element.type && element.type !== action.inputType) {
    return false;
  }

  // Element must be in the document
  if (!document.contains(element)) {
    return false;
  }

  return true;
}

// Wait for element to be ready for interaction
async function waitForElementReady(element) {
  const startTime = Date.now();

  while (Date.now() - startTime < CONFIG.ELEMENT_WAIT_TIMEOUT) {
    // Check if element is ready
    if (element.offsetParent !== null && // Element is visible
        !element.disabled && // Not disabled
        element.offsetWidth > 0 && // Has dimensions
        element.offsetHeight > 0) {
      return true;
    }

    await sleep(CONFIG.ELEMENT_WAIT_INTERVAL);
  }

  return false; // Timeout
}

// Scroll element into view
function scrollToElement(element) {
  try {
    element.scrollIntoView({
      behavior: CONFIG.SCROLL_BEHAVIOR,
      block: 'center',
      inline: 'center'
    });
  } catch (error) {
    // Fallback for older browsers
    element.scrollIntoView(false);
  }
}

// Enhanced form filling with retries and validation
async function fillForm(actions) {
  if (!actions || actions.length === 0) {
    console.log('No actions to replay');
    return;
  }

  console.log('Starting enhanced form fill with', actions.length, 'actions');
  showReplayOverlay();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`Replaying action ${i + 1}/${actions.length}:`, action);

    try {
      const element = await findElement(action);

      if (!element) {
        console.warn('❌ Element not found for action:', action);
        failCount++;
        updateReplayCounter(i + 1, actions.length, successCount, failCount);
        continue;
      }

      // Scroll element into view
      scrollToElement(element);

      // Wait for element to be ready
      const isReady = await waitForElementReady(element);
      if (!isReady) {
        console.warn('⚠️ Element not ready for interaction:', action);
        // Continue anyway, might still work
      }

      // Highlight element being interacted with
      highlightElement(element, '#6366f1');

      // Wait a bit for visual feedback
      await sleep(CONFIG.REPLAY_DELAY);

      // Replay the action based on type
      const success = await replayAction(element, action);

      if (success) {
        successCount++;
        console.log('✓ Action replayed successfully');
      } else {
        failCount++;
        console.warn('❌ Action replay failed');
      }

      updateReplayCounter(i + 1, actions.length, successCount, failCount);

      // Additional delay for form validation/processing
      if (action.type === 'change' || action.type === 'input') {
        await sleep(100);
      }

    } catch (error) {
      console.error('❌ Error replaying action:', action, error);
      failCount++;
      updateReplayCounter(i + 1, actions.length, successCount, failCount);
    }
  }

  console.log(`Form fill complete: ${successCount} success, ${failCount} failed`);

  // Show completion message
  updateReplayStatus(successCount, failCount, actions.length);

  // Hide overlay after a delay
  setTimeout(() => {
    hideReplayOverlay();
  }, 3000);
}

// Replay a single action
async function replayAction(element, action) {
  try {
    // Focus the element first
    if (element.focus) {
      element.focus();
      await sleep(50);
    }

    switch (action.type) {
      case 'input':
        return await replayInputAction(element, action);

      case 'click':
        return await replayClickAction(element, action);

      case 'change':
        return await replayChangeAction(element, action);

      case 'submit':
        console.log('ℹ️ Submit action detected, but not executing to prevent accidental submission');
        return true; // Don't actually submit

      default:
        console.warn('Unknown action type:', action.type);
        return false;
    }
  } catch (error) {
    console.error('Error in replayAction:', error);
    return false;
  }
}

// Replay input action
async function replayInputAction(element, action) {
  if (element.value === action.value) {
    console.log('Input already has correct value');
    return true;
  }

  // Clear existing value
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  // Set new value
  element.value = action.value;

  // Dispatch multiple events to trigger various listeners
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  // Trigger React/Vue change detection
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, action.value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));

  return true;
}

// Replay click action
async function replayClickAction(element, action) {
  if (action.checked !== undefined && (element.type === 'checkbox' || element.type === 'radio')) {
    // For checkbox/radio, set checked state
    element.checked = action.checked;
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
  } else {
    // Regular click
    element.click();
  }

  return true;
}

// Replay change action
async function replayChangeAction(element, action) {
  if (element.tagName === 'SELECT') {
    // Try to select by index first
    if (action.selectedIndex !== undefined && action.selectedIndex < element.options.length) {
      element.selectedIndex = action.selectedIndex;
    }
    // Then try by value
    else if (action.value !== undefined) {
      element.value = action.value;
    }
    // Finally try by text
    else if (action.selectedText) {
      for (let i = 0; i < element.options.length; i++) {
        if (element.options[i].text === action.selectedText) {
          element.selectedIndex = i;
          break;
        }
      }
    }

    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

  } else if (element.type === 'checkbox' || element.type === 'radio') {
    element.checked = action.checked;
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('click', { bubbles: true }));

  } else {
    element.value = action.value;
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return true;
}

// Highlight an element temporarily
function highlightElement(element, color = '#ef4444') {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalZIndex = element.style.zIndex;

  element.style.outline = `3px solid ${color}`;
  element.style.outlineOffset = '2px';
  element.style.zIndex = '999998';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
    element.style.zIndex = originalZIndex;
  }, CONFIG.HIGHLIGHT_DURATION);
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

  // Add styles if not already added
  if (!document.getElementById('omairs-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'omairs-overlay-styles';
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
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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

      .omairs-overlay-status {
        font-size: 11px;
        opacity: 0.8;
        margin-top: 4px;
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

      @keyframes omairs-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100px);
          opacity: 0;
        }
      }

      @keyframes omairs-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
    `;

    document.head.appendChild(style);
  }

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
    <div class="omairs-overlay-status"></div>
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
function updateReplayCounter(current, total, successCount, failCount) {
  if (replayOverlay) {
    const counter = replayOverlay.querySelector('.omairs-overlay-counter');
    if (counter) {
      counter.textContent = `${current}/${total}`;
    }

    if (successCount !== undefined && failCount !== undefined) {
      const status = replayOverlay.querySelector('.omairs-overlay-status');
      if (status) {
        status.textContent = `✓ ${successCount} success ${failCount > 0 ? `• ✗ ${failCount} failed` : ''}`;
      }
    }
  }
}

// Update replay status
function updateReplayStatus(successCount, failCount, total) {
  if (replayOverlay) {
    const text = replayOverlay.querySelector('.omairs-overlay-text');
    const status = replayOverlay.querySelector('.omairs-overlay-status');

    if (failCount === 0) {
      if (text) text.textContent = '✓ Complete';
      if (status) status.textContent = `All ${successCount} actions successful!`;
      replayOverlay.style.background = 'rgba(16, 185, 129, 0.95)';
    } else {
      if (text) text.textContent = '⚠️ Complete';
      if (status) status.textContent = `${successCount}/${total} successful`;
      replayOverlay.style.background = 'rgba(245, 158, 11, 0.95)';
    }
  }
}

// Utility: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
