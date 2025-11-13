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
  document.getElementById('saveBtn').onclick = saveProfile;
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
      showEditSection();
      document.getElementById('saveSection').style.display = 'block';
    }
  } catch (err) {
    alert('Error stopping recording');
  }
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

    return `
      <div class="action-item">
        <div class="action-header">
          <span class="action-type">${actionType}</span>
          <span class="action-index">#${index + 1}</span>
        </div>
        <div class="action-selector">${escapeHtml(action.selector.substring(0, 60))}${action.selector.length > 60 ? '...' : ''}</div>
        ${isEditable ? `
          <input
            type="text"
            class="action-value"
            data-index="${index}"
            value="${escapeHtml(displayValue)}"
            placeholder="Enter value...">
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
    });
  });
}

// Save profile
async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();

  if (!name) {
    alert('Enter a profile name');
    return;
  }

  if (recordedActions.length === 0) {
    alert('No actions to save');
    return;
  }

  const profile = {
    id: Date.now().toString(),
    name: name,
    actions: recordedActions,
    created: Date.now()
  };

  const { profiles = [] } = await chrome.storage.local.get(['profiles']);

  // If editing existing profile, remove the old one
  let updatedProfiles = profiles;
  if (window.editingProfileId) {
    updatedProfiles = profiles.filter(p => p.id !== window.editingProfileId);
    window.editingProfileId = null;
  }

  updatedProfiles.unshift(profile);
  await chrome.storage.local.set({ profiles: updatedProfiles });

  document.getElementById('profileName').value = '';
  document.getElementById('saveSection').style.display = 'none';
  document.getElementById('editSection').style.display = 'none';
  document.getElementById('status').textContent = 'Profile saved!';

  recordedActions = [];
  loadProfiles();
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
  document.getElementById('saveSection').style.display = 'block';
  document.getElementById('status').textContent = `Editing: ${profile.name}`;

  // Delete old profile when saving edited version
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
