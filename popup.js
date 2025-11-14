// Simple popup logic for Form Filler

let currentTab = null;
let recordedActions = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  loadProfiles();
  setupButtons();
  checkRecordingState();
});

// Check if recording is active
async function checkRecordingState() {
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getRecordingState' });

    if (response.isRecording) {
      document.getElementById('recordBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      document.getElementById('status').textContent = `Recording... (${response.actionCount} actions)`;
    }
  } catch (err) {
    // Content script not loaded yet, ignore
  }
}

// Setup button listeners
function setupButtons() {
  document.getElementById('recordBtn').onclick = startRecording;
  document.getElementById('stopBtn').onclick = stopRecording;
  document.getElementById('renameBtn').onclick = renameProfile;
  document.getElementById('applyScriptBtn').onclick = applyScript;

  // Auto-update table when user pastes data
  const scriptInput = document.getElementById('scriptInput');
  scriptInput.addEventListener('input', () => {
    // Debounce to avoid too many updates
    clearTimeout(scriptInput._updateTimeout);
    scriptInput._updateTimeout = setTimeout(() => {
      updateCustomFieldsTable();
    }, 300);
  });
}

// Start recording
async function startRecording() {
  try {
    await chrome.tabs.sendMessage(currentTab.id, { action: 'startRecording' });

    document.getElementById('recordBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('status').textContent = 'Recording...';
  } catch (err) {
    alert('Error: Refresh the page and try again');
  }
}

// Stop recording
async function stopRecording() {
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'stopRecording' });

    recordedActions = response.actions;

    document.getElementById('recordBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('status').textContent = `Captured ${recordedActions.length} actions`;

    if (recordedActions.length > 0) {
      // Auto-save with random name
      const randomName = generateRandomName();
      await autoSaveProfile(randomName);

      // Show edit and script sections
      showEditSection();
      document.getElementById('scriptSection').style.display = 'block';
      document.getElementById('saveSection').style.display = 'block';
      document.getElementById('profileName').value = randomName;
    }
  } catch (err) {
    alert('Error stopping recording');
  }
}

// Generate random profile name
function generateRandomName() {
  const adjectives = ['Quick', 'Smart', 'Fast', 'Easy', 'Auto', 'New', 'Cool', 'Fresh'];
  const nouns = ['Profile', 'Form', 'Setup', 'Fill', 'Data', 'Entry'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj} ${noun} ${num}`;
}

// Auto-save profile
async function autoSaveProfile(name) {
  const profile = {
    id: Date.now().toString(),
    name: name,
    actions: recordedActions,
    created: Date.now()
  };

  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  profiles.unshift(profile);
  await chrome.storage.local.set({ profiles });

  window.currentProfileId = profile.id;
  loadProfiles();
}

// Show edit section with recorded actions
function showEditSection() {
  const editSection = document.getElementById('editSection');
  const actionsList = document.getElementById('actionsList');

  editSection.style.display = 'block';

  actionsList.innerHTML = recordedActions.map((action, index) => {
    const isEditable = action.type === 'input' || action.type === 'change';
    const displayValue = action.value || '';
    const actionType = action.type === 'input' ? 'Text Input' :
                      action.type === 'change' ? 'Dropdown/Select' : 'Click';
    const label = action.label || 'Unknown field';
    const isCustom = action.isCustomField || false;
    const customLabel = action.customLabel || '';

    return `
      <div class="action-item ${isCustom ? 'custom-field' : ''}">
        <div class="action-header">
          <div class="action-header-left">
            <span class="action-type">${actionType}</span>
            ${isCustom ? '<span class="custom-badge">CUSTOM</span>' : '<span class="generic-badge">GENERIC</span>'}
          </div>
          <span class="action-index">#${index + 1}</span>
        </div>
        <div class="action-label">${escapeHtml(label)}</div>
        ${isEditable ? `
          ${isCustom ? `
            <input
              type="text"
              class="custom-field-label"
              data-index="${index}"
              value="${escapeHtml(customLabel)}"
              placeholder="Custom field name (e.g., Name, Email, Company)">
          ` : ''}
          <input
            type="text"
            class="action-value"
            data-index="${index}"
            value="${escapeHtml(displayValue)}"
            placeholder="Enter value...">
          <button class="btn-toggle-custom" data-index="${index}">
            ${isCustom ? '✓ Custom Field' : 'Mark as Custom'}
          </button>
        ` : `
          <div class="action-value-readonly">${action.checked !== undefined ? (action.checked ? 'Checked' : 'Unchecked') : 'Click action'}</div>
        `}
      </div>
    `;
  }).join('');

  // Add event listeners to update values
  actionsList.querySelectorAll('.action-value').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      recordedActions[index].value = e.target.value;
      // Auto-update profile in storage
      updateProfileActions();
    });
  });

  // Add event listeners for custom field labels
  actionsList.querySelectorAll('.custom-field-label').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      recordedActions[index].customLabel = e.target.value;
      // Auto-update profile in storage
      updateProfileActions();
      // Update mapping table
      updateCustomFieldsTable();
    });
  });

  // Add event listeners to toggle custom field
  actionsList.querySelectorAll('.btn-toggle-custom').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      recordedActions[index].isCustomField = !recordedActions[index].isCustomField;
      // Auto-update profile in storage
      updateProfileActions();
      // Refresh display
      showEditSection();
      // Update mapping table
      updateCustomFieldsTable();
    });
  });

  // Update custom fields table
  updateCustomFieldsTable();
}

// Update custom fields mapping table
function updateCustomFieldsTable() {
  const customFields = recordedActions.filter(a =>
    (a.type === 'input' || a.type === 'change') && a.isCustomField === true
  );

  const tableContainer = document.getElementById('customFieldsTable');

  if (customFields.length === 0) {
    tableContainer.innerHTML = '<p class="no-custom-fields">No custom fields marked yet. Mark fields as "Custom" above to create a data template.</p>';
    return;
  }

  // Get parsed cells if data is pasted
  const scriptText = document.getElementById('scriptInput')?.value.trim() || '';
  const cells = scriptText ? parseDataCells(scriptText) : [];

  let tableHTML = '';

  // Show parsed cells if available
  if (cells.length > 0) {
    tableHTML += `
      <div class="parsed-cells">
        <h4>Pasted Data Cells</h4>
        <table class="cells-table">
          <thead>
            <tr>
              <th>Cell #</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${cells.map((cell, idx) => `
              <tr>
                <td><span class="cell-badge">${idx + 1}</span></td>
                <td class="cell-value">${escapeHtml(cell)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Show mapping table
  tableHTML += `
    <h4>Custom Field Mapping</h4>
    <table class="mapping-table">
      <thead>
        <tr>
          <th>Custom Field</th>
          <th>Goes To</th>
          ${cells.length > 0 ? '<th>Select Cell</th>' : ''}
          <th>Current Value</th>
        </tr>
      </thead>
      <tbody>
        ${customFields.map((field, index) => {
          const fieldIndex = recordedActions.indexOf(field);
          const mappedCell = field.mappedCellIndex !== undefined ? field.mappedCellIndex : index;

          return `
            <tr>
              <td><strong>${escapeHtml(field.customLabel || `Custom ${index + 1}`)}</strong></td>
              <td class="field-label">${escapeHtml(field.label || 'Unknown')}</td>
              ${cells.length > 0 ? `
                <td>
                  <select class="cell-selector" data-field-index="${fieldIndex}">
                    <option value="">-- None --</option>
                    ${cells.map((cell, cellIdx) => `
                      <option value="${cellIdx}" ${cellIdx === mappedCell ? 'selected' : ''}>
                        Cell ${cellIdx + 1}: ${escapeHtml(cell.substring(0, 20))}${cell.length > 20 ? '...' : ''}
                      </option>
                    `).join('')}
                  </select>
                </td>
              ` : ''}
              <td class="field-value">${escapeHtml(field.value || '(empty)')}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <p class="table-help">${cells.length > 0 ? 'Select which cell maps to each custom field, then click Apply.' : 'Paste data below to see cell mapping options.'}</p>
  `;

  tableContainer.innerHTML = tableHTML;

  // Add event listeners to cell selectors
  tableContainer.querySelectorAll('.cell-selector').forEach(select => {
    select.addEventListener('change', (e) => {
      const fieldIndex = parseInt(e.target.dataset.fieldIndex);
      const cellIndex = e.target.value === '' ? undefined : parseInt(e.target.value);
      recordedActions[fieldIndex].mappedCellIndex = cellIndex;
      updateProfileActions();
    });
  });
}

// Parse pasted data into cells
function parseDataCells(text) {
  // Split by tabs first (spreadsheet format)
  let cells = text.split('\t');

  // If no tabs, split by multiple spaces
  if (cells.length === 1) {
    cells = text.split(/\s{2,}/);
  }

  // If still one cell, split by newlines
  if (cells.length === 1) {
    cells = text.split('\n');
  }

  return cells.map(c => c.trim()).filter(c => c);
}

// Rename current profile
async function renameProfile() {
  const newName = document.getElementById('profileName').value.trim();

  if (!newName) {
    alert('Enter a profile name');
    return;
  }

  const profileId = window.currentProfileId || window.editingProfileId;
  if (!profileId) {
    alert('No profile to rename');
    return;
  }

  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const profile = profiles.find(p => p.id === profileId);

  if (profile) {
    profile.name = newName;
    await chrome.storage.local.set({ profiles });
    document.getElementById('status').textContent = 'Profile renamed!';
    loadProfiles();
  }
}

// Apply script data to fields using manual mapping
function applyScript() {
  const scriptText = document.getElementById('scriptInput').value.trim();

  if (!scriptText) {
    alert('Paste some data first');
    return;
  }

  // Parse into cells
  const cells = parseDataCells(scriptText);

  // Get only CUSTOM-MARKED editable fields
  const customFields = recordedActions.filter(a =>
    (a.type === 'input' || a.type === 'change') && a.isCustomField === true
  );

  if (customFields.length === 0) {
    alert('No custom fields marked! Click "Mark as Custom" on fields you want to replace.');
    return;
  }

  // Apply values using MANUAL MAPPING
  let applied = 0;
  const mapping = [];

  customFields.forEach((field, index) => {
    const cellIndex = field.mappedCellIndex !== undefined ? field.mappedCellIndex : index;

    if (cellIndex !== undefined && cellIndex < cells.length) {
      const fieldLabel = field.customLabel || `Custom ${index + 1}`;
      const oldValue = field.value;
      const newValue = cells[cellIndex];

      field.value = newValue;

      // For dropdowns, also update displayText for smart matching
      if (field.type === 'change' && field.tagName === 'SELECT') {
        field.displayText = newValue;
      }

      applied++;
      mapping.push(`${fieldLabel}: "${oldValue}" → "${newValue}" (Cell ${cellIndex + 1})`);
    }
  });

  // Update the profile with new values
  if (window.currentProfileId || window.editingProfileId) {
    updateProfileActions();
  }

  // Refresh edit section and table
  showEditSection();

  const total = customFields.length;
  const statusMsg = `Applied ${applied}/${total} custom fields:\n${mapping.slice(0, 3).join('\n')}${mapping.length > 3 ? '\n...' : ''}`;
  document.getElementById('status').textContent = statusMsg;

  // Keep input for reference
  // document.getElementById('scriptInput').value = '';
}

// Update profile actions in storage
async function updateProfileActions() {
  const profileId = window.currentProfileId || window.editingProfileId;
  if (!profileId) return;

  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const profile = profiles.find(p => p.id === profileId);

  if (profile) {
    profile.actions = recordedActions;
    await chrome.storage.local.set({ profiles });
  }
}

// Load saved profiles
async function loadProfiles() {
  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const list = document.getElementById('profilesList');

  if (profiles.length === 0) {
    list.innerHTML = '<div class="empty">No profiles yet</div>';
    return;
  }

  list.innerHTML = profiles.map(p => `
    <div class="profile">
      <div class="profile-name">${escapeHtml(p.name)}</div>
      <div class="profile-actions">${p.actions.length} actions</div>
      <div class="profile-buttons">
        <button class="btn-fill" data-id="${p.id}">Fill</button>
        <button class="btn-edit" data-id="${p.id}">Edit</button>
        <button class="btn-delete" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  list.querySelectorAll('.btn-fill').forEach(btn => {
    btn.onclick = () => fillForm(btn.dataset.id);
  });

  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => editProfile(btn.dataset.id);
  });

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => deleteProfile(btn.dataset.id);
  });
}

// Edit profile
async function editProfile(profileId) {
  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const profile = profiles.find(p => p.id === profileId);

  if (!profile) return;

  recordedActions = JSON.parse(JSON.stringify(profile.actions)); // Deep copy
  document.getElementById('profileName').value = profile.name;

  showEditSection();
  document.getElementById('scriptSection').style.display = 'block';
  document.getElementById('saveSection').style.display = 'block';
  document.getElementById('status').textContent = `Editing: ${profile.name}`;

  // Set current profile ID for updates
  window.currentProfileId = profileId;
  window.editingProfileId = profileId;
}

// Fill form with profile
async function fillForm(profileId) {
  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const profile = profiles.find(p => p.id === profileId);

  if (!profile) return;

  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      action: 'fillForm',
      actions: profile.actions
    });

    document.getElementById('status').textContent = 'Filling form...';
  } catch (err) {
    alert('Error: Refresh the page and try again');
  }
}

// Delete profile
async function deleteProfile(profileId) {
  if (!confirm('Delete this profile?')) return;

  const { profiles = [] } = await chrome.storage.local.get(['profiles']);
  const filtered = profiles.filter(p => p.id !== profileId);

  await chrome.storage.local.set({ profiles: filtered });
  loadProfiles();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
