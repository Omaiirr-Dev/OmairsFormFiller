// Content script for Omair's Form Filler - ENHANCED VERSION
// Captures EVERY interaction with maximum reliability and precision

let isRecording = false;
let recordedActions = [];
let actionCounter = 0;

// Visual feedback overlays
let recordingOverlay = null;
let replayOverlay = null;

// Track last action to prevent duplicates
let lastActionSignature = null;
let lastActionTime = 0;

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
  lastActionSignature = null;
  lastActionTime = 0;

  console.log('Recording started - Enhanced mode');
  showRecordingOverlay();

  // Add event listeners for ALL interaction types (capture phase for maximum coverage)
  document.addEventListener('click', captureClick, true);
  document.addEventListener('dblclick', captureDoubleClick, true);
  document.addEventListener('input', captureInput, true);
  document.addEventListener('change', captureChange, true);
  document.addEventListener('submit', captureSubmit, true);
  document.addEventListener('focus', captureFocus, true);
  document.addEventListener('keydown', captureKeydown, true);
  document.addEventListener('mousedown', captureMouseDown, true);
}

// Stop recording
function stopRecording() {
  if (!isRecording) return [];

  isRecording = false;

  console.log('Recording stopped. Total actions captured:', recordedActions.length);
  hideRecordingOverlay();

  // Remove event listeners
  document.removeEventListener('click', captureClick, true);
  document.removeEventListener('dblclick', captureDoubleClick, true);
  document.removeEventListener('input', captureInput, true);
  document.removeEventListener('change', captureChange, true);
  document.removeEventListener('submit', captureSubmit, true);
  document.removeEventListener('focus', captureFocus, true);
  document.removeEventListener('keydown', captureKeydown, true);
  document.removeEventListener('mousedown', captureMouseDown, true);

  return [...recordedActions];
}

// Capture click events (buttons, links, radio buttons, checkboxes)
function captureClick(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip clicks on the recording overlay
  if (element.closest('.omairs-form-filler-overlay')) return;

  // Create action signature to prevent duplicates within 100ms
  const signature = `click-${getElementSignature(element)}`;
  if (signature === lastActionSignature && Date.now() - lastActionTime < 100) {
    return;
  }

  const action = {
    id: ++actionCounter,
    type: 'click',
    timestamp: Date.now(),
    selectors: getAllSelectors(element),
    elementType: element.tagName.toLowerCase(),
    elementText: getElementText(element),
    elementValue: element.value || '',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClass: element.className || '',
    elementPlaceholder: element.placeholder || '',
    elementAriaLabel: element.getAttribute('aria-label') || '',
    elementRole: element.getAttribute('role') || '',
    inputType: element.type || '',
    checked: element.checked,
    href: element.href || '',
    url: window.location.href,
    // Additional context
    isButton: isButton(element),
    isLink: element.tagName === 'A',
    isRadio: element.type === 'radio',
    isCheckbox: element.type === 'checkbox',
    radioGroup: element.type === 'radio' ? element.name : null,
    // Position data as final fallback
    boundingRect: element.getBoundingClientRect(),
    xpath: getXPath(element)
  };

  recordedActions.push(action);
  console.log('✓ Captured CLICK:', action);

  highlightElement(element);
  updateRecordingCounter();

  lastActionSignature = signature;
  lastActionTime = Date.now();
}

// Capture double-click events
function captureDoubleClick(event) {
  if (!isRecording) return;

  const element = event.target;
  if (element.closest('.omairs-form-filler-overlay')) return;

  const action = {
    id: ++actionCounter,
    type: 'dblclick',
    timestamp: Date.now(),
    selectors: getAllSelectors(element),
    elementType: element.tagName.toLowerCase(),
    elementText: getElementText(element),
    url: window.location.href,
    xpath: getXPath(element)
  };

  recordedActions.push(action);
  console.log('✓ Captured DOUBLE-CLICK:', action);
  updateRecordingCounter();
}

// Capture input events (text fields, textareas, dates, numbers, etc.)
function captureInput(event) {
  if (!isRecording) return;

  const element = event.target;

  // Only capture actual input elements
  if (!['INPUT', 'TEXTAREA'].includes(element.tagName)) return;

  // Find existing input action for this element and update it
  const signature = getElementSignature(element);
  const existingIndex = recordedActions.findIndex(
    a => a.type === 'input' && a.elementSignature === signature
  );

  const action = {
    id: existingIndex >= 0 ? recordedActions[existingIndex].id : ++actionCounter,
    type: 'input',
    timestamp: Date.now(),
    selectors: getAllSelectors(element),
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || 'text',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClass: element.className || '',
    elementPlaceholder: element.placeholder || '',
    elementAriaLabel: element.getAttribute('aria-label') || '',
    value: element.value,
    valueAsNumber: element.valueAsNumber,
    valueAsDate: element.valueAsDate ? element.valueAsDate.toISOString() : null,
    url: window.location.href,
    elementSignature: signature,
    xpath: getXPath(element),
    // Special handling for different input types
    isDate: ['date', 'datetime-local', 'month', 'week', 'time'].includes(element.type),
    isNumber: element.type === 'number',
    isFile: element.type === 'file',
    isColor: element.type === 'color',
    isRange: element.type === 'range',
    min: element.min,
    max: element.max,
    step: element.step
  };

  if (existingIndex >= 0) {
    recordedActions[existingIndex] = action;
  } else {
    recordedActions.push(action);
  }

  console.log('✓ Captured INPUT:', action);
  updateRecordingCounter();
}

// Capture change events (select dropdowns, radio buttons, checkboxes, file uploads)
function captureChange(event) {
  if (!isRecording) return;

  const element = event.target;

  // Skip if not a form element
  if (!['SELECT', 'INPUT', 'TEXTAREA'].includes(element.tagName)) return;

  // Check for duplicate prevention
  const signature = `change-${getElementSignature(element)}`;
  if (signature === lastActionSignature && Date.now() - lastActionTime < 50) {
    return;
  }

  const action = {
    id: ++actionCounter,
    type: 'change',
    timestamp: Date.now(),
    selectors: getAllSelectors(element),
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || '',
    elementName: element.name || '',
    elementId: element.id || '',
    elementClass: element.className || '',
    elementAriaLabel: element.getAttribute('aria-label') || '',
    value: element.value,
    checked: element.checked,
    url: window.location.href,
    xpath: getXPath(element),
    // For radio buttons
    isRadio: element.type === 'radio',
    radioGroup: element.type === 'radio' ? element.name : null,
    // For checkboxes
    isCheckbox: element.type === 'checkbox',
    // For select dropdowns
    isSelect: element.tagName === 'SELECT',
    selectedIndex: element.selectedIndex,
    selectedOptions: element.selectedOptions ? Array.from(element.selectedOptions).map(o => ({
      value: o.value,
      text: o.text,
      index: o.index
    })) : [],
    selectedText: element.tagName === 'SELECT' && element.selectedIndex >= 0
      ? element.options[element.selectedIndex]?.text
      : '',
    multiple: element.multiple,
    // For file inputs
    isFile: element.type === 'file',
    files: element.type === 'file' && element.files ? Array.from(element.files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })) : []
  };

  recordedActions.push(action);
  console.log('✓ Captured CHANGE:', action);

  highlightElement(element);
  updateRecordingCounter();

  lastActionSignature = signature;
  lastActionTime = Date.now();
}

// Capture form submit events
function captureSubmit(event) {
  if (!isRecording) return;

  const element = event.target;

  const action = {
    id: ++actionCounter,
    type: 'submit',
    timestamp: Date.now(),
    selectors: getAllSelectors(element),
    elementType: element.tagName.toLowerCase(),
    elementId: element.id || '',
    elementName: element.name || '',
    elementClass: element.className || '',
    url: window.location.href,
    xpath: getXPath(element)
  };

  recordedActions.push(action);
  console.log('✓ Captured SUBMIT:', action);

  highlightElement(element);
  updateRecordingCounter();
}

// Capture focus events (optional, for additional context)
function captureFocus(event) {
  // Only capture focus on form elements
  const element = event.target;
  if (!['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element.tagName)) return;

  // We log this but don't always add it as an action
  console.log('→ Focus on:', element.tagName, element.name || element.id);
}

// Capture keydown for special keys (Enter on forms, etc.)
function captureKeydown(event) {
  if (!isRecording) return;

  // Capture Enter key on inputs (might submit form or move to next field)
  if (event.key === 'Enter') {
    const element = event.target;
    if (['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      console.log('→ Enter key pressed on:', element.tagName, element.name || element.id);
      // We can optionally capture this as an action if needed
    }
  }
}

// Capture mousedown for elements that might not fire click
function captureMouseDown(event) {
  // This provides additional coverage for custom elements
  // We log but don't duplicate click events
}

// ============================================================================
// ELEMENT SELECTOR GENERATION - Multiple strategies for maximum reliability
// ============================================================================

/**
 * Generate ALL possible selectors for an element
 * This ensures we can find the element even if the page structure changes
 */
function getAllSelectors(element) {
  const selectors = {
    // Strategy 1: ID (most reliable if stable)
    byId: element.id ? `#${CSS.escape(element.id)}` : null,

    // Strategy 2: Name + Type (very reliable for form fields)
    byName: element.name ? `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]${element.type ? `[type="${element.type}"]` : ''}` : null,

    // Strategy 3: Data attributes (often stable)
    byDataAttrs: getDataAttributeSelector(element),

    // Strategy 4: ARIA label (accessible and often stable)
    byAriaLabel: element.getAttribute('aria-label')
      ? `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(element.getAttribute('aria-label'))}"]`
      : null,

    // Strategy 5: Placeholder (for inputs)
    byPlaceholder: element.placeholder
      ? `${element.tagName.toLowerCase()}[placeholder="${CSS.escape(element.placeholder)}"]`
      : null,

    // Strategy 6: For/ID relationship (for labels and their inputs)
    byFor: element.tagName === 'INPUT' && element.id
      ? `label[for="${CSS.escape(element.id)}"] + input, label[for="${CSS.escape(element.id)}"] input`
      : null,

    // Strategy 7: Text content (for buttons and links)
    byText: getTextSelector(element),

    // Strategy 8: CSS Path (structural)
    byCssPath: getCssPath(element),

    // Strategy 9: XPath (most reliable fallback)
    byXPath: getXPath(element),

    // Strategy 10: Position-based (last resort)
    byPosition: getPositionSelector(element),

    // Strategy 11: Parent context + attributes
    byParentContext: getParentContextSelector(element),

    // Strategy 12: Class-based (if classes are stable)
    byClass: getClassSelector(element)
  };

  // Filter out null values
  return Object.fromEntries(
    Object.entries(selectors).filter(([_, value]) => value !== null)
  );
}

function getDataAttributeSelector(element) {
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${CSS.escape(attr.value)}"]`)
    .join('');

  return dataAttrs ? `${element.tagName.toLowerCase()}${dataAttrs}` : null;
}

function getTextSelector(element) {
  const text = getElementText(element);
  if (!text || text.length > 50) return null;

  const tagName = element.tagName.toLowerCase();

  // For buttons and links, text content is very reliable
  if (['BUTTON', 'A', 'LABEL'].includes(element.tagName)) {
    // We can't use :contains in CSS, so we'll use this in custom finding logic
    return `${tagName}:text("${text}")`;
  }

  return null;
}

function getCssPath(element) {
  const path = [];
  let current = element;

  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();

    // Add classes (filter out dynamic ones)
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
        .filter(c => c && !c.match(/^(omairs-|js-|is-|has-)/)); // Filter common dynamic classes

      if (classes.length > 0 && classes.length < 5) { // Avoid too many classes
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }

    // Add nth-of-type for uniqueness
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        el => el.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;

    // Stop at body or after 6 levels
    if (!current || current.tagName === 'BODY' || path.length >= 6) {
      break;
    }
  }

  return path.join(' > ');
}

function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    parts.unshift(`${tagName}${pathIndex}`);

    current = current.parentNode;

    if (current && current.tagName === 'BODY') {
      parts.unshift('body');
      break;
    }
  }

  return '//' + parts.join('/');
}

function getPositionSelector(element) {
  const tagName = element.tagName.toLowerCase();
  const type = element.type ? `[type="${element.type}"]` : '';

  // Get all elements of same type
  const selector = `${tagName}${type}`;
  const allElements = Array.from(document.querySelectorAll(selector));
  const index = allElements.indexOf(element);

  if (index >= 0) {
    return `${selector}:eq(${index})`;
  }

  return null;
}

function getParentContextSelector(element) {
  const parent = element.parentElement;
  if (!parent) return null;

  let parentSelector = '';

  if (parent.id) {
    parentSelector = `#${CSS.escape(parent.id)}`;
  } else if (parent.className && typeof parent.className === 'string') {
    const classes = parent.className.trim().split(/\s+/)
      .filter(c => c && !c.match(/^(omairs-|js-|is-|has-)/))
      .slice(0, 2); // Take first 2 stable classes

    if (classes.length > 0) {
      parentSelector = parent.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
    }
  }

  if (parentSelector) {
    const childTag = element.tagName.toLowerCase();
    const childType = element.type ? `[type="${element.type}"]` : '';
    const childName = element.name ? `[name="${CSS.escape(element.name)}"]` : '';

    return `${parentSelector} > ${childTag}${childType}${childName}`;
  }

  return null;
}

function getClassSelector(element) {
  if (!element.className || typeof element.className !== 'string') return null;

  const classes = element.className.trim().split(/\s+/)
    .filter(c => c && !c.match(/^(omairs-|js-|is-|has-|active|hover|focus)/));

  if (classes.length === 0) return null;

  return element.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
}

// ============================================================================
// ELEMENT FINDING - Try all selector strategies
// ============================================================================

/**
 * Find element using all available selectors with priority order
 */
function findElement(action) {
  const selectors = action.selectors || {};

  // Strategy priority order (most reliable first)
  const strategies = [
    { name: 'byId', selector: selectors.byId },
    { name: 'byName', selector: selectors.byName },
    { name: 'byDataAttrs', selector: selectors.byDataAttrs },
    { name: 'byAriaLabel', selector: selectors.byAriaLabel },
    { name: 'byPlaceholder', selector: selectors.byPlaceholder },
    { name: 'byParentContext', selector: selectors.byParentContext },
    { name: 'byClass', selector: selectors.byClass },
    { name: 'byCssPath', selector: selectors.byCssPath },
  ];

  // Try each CSS selector strategy
  for (const strategy of strategies) {
    if (!strategy.selector) continue;

    try {
      const element = document.querySelector(strategy.selector);
      if (element && validateElement(element, action)) {
        console.log(`✓ Found element using ${strategy.name}:`, strategy.selector);
        return element;
      }
    } catch (error) {
      console.warn(`Failed to use ${strategy.name}:`, error.message);
    }
  }

  // Try XPath
  if (selectors.byXPath) {
    try {
      const element = findByXPath(selectors.byXPath);
      if (element && validateElement(element, action)) {
        console.log('✓ Found element using XPath');
        return element;
      }
    } catch (error) {
      console.warn('XPath failed:', error.message);
    }
  }

  // Try text-based search (for buttons and links)
  if (selectors.byText) {
    try {
      const element = findByText(action);
      if (element) {
        console.log('✓ Found element using text content');
        return element;
      }
    } catch (error) {
      console.warn('Text search failed:', error.message);
    }
  }

  // Last resort: position-based
  if (selectors.byPosition) {
    try {
      const element = findByPosition(selectors.byPosition, action);
      if (element) {
        console.log('⚠ Found element using position (least reliable)');
        return element;
      }
    } catch (error) {
      console.warn('Position search failed:', error.message);
    }
  }

  console.error('❌ Could not find element for action:', action);
  return null;
}

function findByXPath(xpath) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue;
}

function findByText(action) {
  const text = action.elementText;
  if (!text) return null;

  const tagName = action.elementType;
  const elements = Array.from(document.querySelectorAll(tagName));

  return elements.find(el => {
    const elText = getElementText(el);
    return elText && elText.trim() === text.trim();
  });
}

function findByPosition(selector, action) {
  // Extract tag and type from selector
  const match = selector.match(/^([a-z]+)(\[type="([^"]+)"\])?:eq\((\d+)\)/);
  if (!match) return null;

  const tagName = match[1];
  const type = match[3];
  const index = parseInt(match[4]);

  let query = tagName;
  if (type) query += `[type="${type}"]`;

  const elements = Array.from(document.querySelectorAll(query));
  return elements[index] || null;
}

/**
 * Validate that the found element matches the expected properties
 */
function validateElement(element, action) {
  // Check tag name
  if (element.tagName.toLowerCase() !== action.elementType) {
    return false;
  }

  // Check input type if specified
  if (action.inputType && element.type && element.type !== action.inputType) {
    return false;
  }

  // For radio buttons, check name matches (radio group)
  if (action.isRadio && action.radioGroup) {
    if (element.name !== action.radioGroup) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// FORM FILLING - Instant and reliable
// ============================================================================

async function fillForm(actions) {
  if (!actions || actions.length === 0) {
    console.log('No actions to replay');
    return;
  }

  console.log(`Starting form fill with ${actions.length} actions`);
  showReplayOverlay();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`[${i + 1}/${actions.length}] Replaying:`, action.type, action.elementName || action.elementId);

    try {
      const element = findElement(action);

      if (!element) {
        console.warn('❌ Element not found for action:', action);
        failCount++;
        continue;
      }

      // Highlight element
      highlightElement(element, '#6366f1');

      // Small delay for visual feedback (can be reduced to 0 for instant)
      await sleep(100);

      // Execute the action
      const success = await executeAction(element, action);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      updateReplayCounter(i + 1, actions.length);

    } catch (error) {
      console.error('❌ Error replaying action:', error);
      failCount++;
    }
  }

  console.log(`Form fill complete! Success: ${successCount}, Failed: ${failCount}`);

  // Hide overlay after delay
  setTimeout(() => {
    hideReplayOverlay();
  }, 1500);
}

/**
 * Execute an action on an element with proper event triggering
 */
async function executeAction(element, action) {
  try {
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(50);

    switch (action.type) {
      case 'input':
        return executeInput(element, action);

      case 'click':
        return executeClick(element, action);

      case 'change':
        return executeChange(element, action);

      case 'dblclick':
        element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        element.click();
        element.click();
        return true;

      case 'submit':
        // Don't auto-submit to prevent accidental form submission
        console.log('⚠ Submit action skipped (prevented auto-submission)');
        return true;

      default:
        console.warn('Unknown action type:', action.type);
        return false;
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return false;
  }
}

function executeInput(element, action) {
  // Set the value instantly
  const oldValue = element.value;
  element.value = action.value || '';

  // For date/time inputs, use the proper value setters
  if (action.isDate && action.valueAsDate) {
    try {
      element.valueAsDate = new Date(action.valueAsDate);
    } catch (e) {
      element.value = action.value;
    }
  } else if (action.isNumber && action.valueAsNumber !== undefined && !isNaN(action.valueAsNumber)) {
    element.valueAsNumber = action.valueAsNumber;
  }

  // Trigger events that frameworks expect
  if (oldValue !== element.value) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Trigger keyboard events for frameworks that listen to them
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    // Blur to ensure change is registered
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  return true;
}

function executeClick(element, action) {
  // Handle radio buttons
  if (action.isRadio) {
    if (!element.checked) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('click', { bubbles: true }));
    }
    return true;
  }

  // Handle checkboxes
  if (action.isCheckbox) {
    const shouldBeChecked = action.checked === true;
    if (element.checked !== shouldBeChecked) {
      element.checked = shouldBeChecked;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('click', { bubbles: true }));
    }
    return true;
  }

  // Regular click (buttons, links, etc.)
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  element.click();

  return true;
}

function executeChange(element, action) {
  // Handle SELECT dropdowns
  if (action.isSelect) {
    if (action.selectedIndex !== undefined && action.selectedIndex >= 0) {
      element.selectedIndex = action.selectedIndex;
    } else if (action.value !== undefined) {
      element.value = action.value;
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // Handle radio buttons
  if (action.isRadio) {
    element.checked = true;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Handle checkboxes
  if (action.isCheckbox) {
    element.checked = action.checked === true;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Handle other inputs
  if (action.value !== undefined) {
    element.value = action.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getElementText(element) {
  // For inputs, use value or placeholder
  if (element.tagName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') {
    return element.value || element.placeholder || '';
  }

  // For other elements, use innerText but limit length
  const text = (element.innerText || element.textContent || '').trim();
  return text.substring(0, 100);
}

function getElementSignature(element) {
  // Create a unique signature for duplicate detection
  return `${element.tagName}-${element.name || ''}-${element.id || ''}-${element.type || ''}`;
}

function isButton(element) {
  return element.tagName === 'BUTTON' ||
         element.type === 'button' ||
         element.type === 'submit' ||
         element.getAttribute('role') === 'button';
}

function highlightElement(element, color = '#ef4444') {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;

  element.style.outline = `3px solid ${color}`;
  element.style.outlineOffset = '2px';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
  }, 400);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// UI OVERLAY FUNCTIONS
// ============================================================================

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

  const style = document.createElement('style');
  style.textContent = `
    .omairs-form-filler-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
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
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes omairs-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(recordingOverlay);
}

function hideRecordingOverlay() {
  if (recordingOverlay) {
    recordingOverlay.remove();
    recordingOverlay = null;
  }
}

function updateRecordingCounter() {
  if (recordingOverlay) {
    const counter = recordingOverlay.querySelector('.omairs-overlay-counter');
    if (counter) {
      counter.textContent = `${recordedActions.length} action${recordedActions.length !== 1 ? 's' : ''}`;
    }
  }
}

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

function hideReplayOverlay() {
  if (replayOverlay) {
    replayOverlay.remove();
    replayOverlay = null;
  }
}

function updateReplayCounter(current, total) {
  if (replayOverlay) {
    const counter = replayOverlay.querySelector('.omairs-overlay-counter');
    if (counter) {
      counter.textContent = `${current}/${total}`;
    }
  }
}
