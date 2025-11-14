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

      // Show edit section
      showEditSection();
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
    const displayValue = action.displayText || action.value || '';
    const actionType = action.type === 'input' ? 'Text Input' :
                      action.type === 'change' ? 'Dropdown/Select' : 'Click';
    const label = action.label || 'Unknown field';

    return `
      <div class="action-item">
        <div class="action-header">
          <div class="action-header-left">
            <span class="action-type">${actionType}</span>
          </div>
          <span class="action-index">#${index + 1}</span>
        </div>
        <div class="action-label">${escapeHtml(label)}</div>
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
      const newValue = e.target.value;
      recordedActions[index].value = newValue;

      // For dropdowns, also update displayText
      if (recordedActions[index].type === 'change') {
        recordedActions[index].displayText = newValue;
      }

      // Auto-update profile in storage
      updateProfileActions();
    });
  });
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
