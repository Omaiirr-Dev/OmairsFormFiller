// Popup script for Omair's Form Filler

let currentTab = null;
let isRecording = false;
let currentActions = [];
let editingProfile = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Load saved profiles
  await loadProfiles();

  // Check if recording is in progress
  await checkRecordingStatus();

  // Set up event listeners
  setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
  // Record button
  document.getElementById('recordBtn').addEventListener('click', startRecording);

  // Stop button
  document.getElementById('stopBtn').addEventListener('click', stopRecording);

  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveProfile);

  // Modal controls
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeModal);
  document.getElementById('saveEditBtn').addEventListener('click', saveEditedProfile);

  // Close modal on background click
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
      closeModal();
    }
  });
}

// Check if recording is in progress
async function checkRecordingStatus() {
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getRecordingStatus' });
    if (response && response.isRecording) {
      isRecording = true;
      updateUIForRecording(response.actionCount);
    }
  } catch (error) {
    console.log('No recording in progress');
  }
}

// Start recording
async function startRecording() {
  if (!currentTab) {
    showError('No active tab found');
    return;
  }

  try {
    // Inject content script if needed
    await ensureContentScript();

    // Start recording
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'startRecording' });

    if (response && response.success) {
      isRecording = true;
      currentActions = [];
      updateUIForRecording(0);
      setStatus('Recording', 'recording');

      // Update action count periodically
      startActionCountUpdater();
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    showError('Failed to start recording: ' + error.message);
  }
}

// Stop recording
async function stopRecording() {
  if (!currentTab || !isRecording) return;

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'stopRecording' });

    if (response && response.success) {
      isRecording = false;
      currentActions = response.actions || [];

      updateUIForStopped();
      setStatus('Ready', 'ready');

      // Stop action count updater
      stopActionCountUpdater();

      // Show save section if we have actions
      if (currentActions.length > 0) {
        document.getElementById('saveSection').style.display = 'block';
        document.getElementById('profileName').focus();
      } else {
        showError('No actions were recorded');
      }
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    showError('Failed to stop recording');
  }
}

// Save profile
async function saveProfile() {
  const nameInput = document.getElementById('profileName');
  const name = nameInput.value.trim();

  if (!name) {
    showError('Please enter a profile name');
    nameInput.focus();
    return;
  }

  if (currentActions.length === 0) {
    showError('No actions to save');
    return;
  }

  const profile = {
    id: Date.now().toString(),
    name: name,
    actions: currentActions,
    url: currentTab.url,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    // Get existing profiles
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];

    // Add new profile
    profiles.unshift(profile);

    // Save to storage
    await chrome.storage.local.set({ profiles: profiles });

    console.log('Profile saved:', profile);

    // Reset UI
    nameInput.value = '';
    document.getElementById('saveSection').style.display = 'none';
    currentActions = [];

    // Reload profiles
    await loadProfiles();

    showSuccess('Profile saved successfully!');
  } catch (error) {
    console.error('Error saving profile:', error);
    showError('Failed to save profile');
  }
}

// Load profiles from storage
async function loadProfiles() {
  try {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];

    const profilesList = document.getElementById('profilesList');

    if (profiles.length === 0) {
      profilesList.innerHTML = '<p class="empty-state">No profiles saved yet. Start recording to create one!</p>';
      return;
    }

    profilesList.innerHTML = profiles.map(profile => `
      <div class="profile-card" data-id="${profile.id}">
        <div class="profile-header">
          <div class="profile-name">${escapeHtml(profile.name)}</div>
        </div>
        <div class="profile-meta">
          ${profile.actions.length} action${profile.actions.length !== 1 ? 's' : ''} •
          ${new Date(profile.createdAt).toLocaleDateString()}
        </div>
        <div class="profile-actions">
          <button class="btn-small btn-fill" data-id="${profile.id}">▶ Fill Form</button>
          <button class="btn-small btn-edit" data-id="${profile.id}">✏️ Edit</button>
          <button class="btn-small btn-delete" data-id="${profile.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    profilesList.querySelectorAll('.btn-fill').forEach(btn => {
      btn.addEventListener('click', () => fillForm(btn.dataset.id));
    });

    profilesList.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editProfile(btn.dataset.id));
    });

    profilesList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProfile(btn.dataset.id));
    });
  } catch (error) {
    console.error('Error loading profiles:', error);
    showError('Failed to load profiles');
  }
}

// Fill form with profile
async function fillForm(profileId) {
  try {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    const profile = profiles.find(p => p.id === profileId);

    if (!profile) {
      showError('Profile not found');
      return;
    }

    // Inject content script if needed
    await ensureContentScript();

    // Send fill command
    setStatus('Filling form...', 'replaying');

    await chrome.tabs.sendMessage(currentTab.id, {
      action: 'fillForm',
      actions: profile.actions
    });

    showSuccess('Form filled successfully!');

    setTimeout(() => {
      setStatus('Ready', 'ready');
    }, 2000);
  } catch (error) {
    console.error('Error filling form:', error);
    showError('Failed to fill form: ' + error.message);
    setStatus('Ready', 'ready');
  }
}

// Edit profile
async function editProfile(profileId) {
  try {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    const profile = profiles.find(p => p.id === profileId);

    if (!profile) {
      showError('Profile not found');
      return;
    }

    editingProfile = profile;

    // Populate modal
    document.getElementById('editProfileName').value = profile.name;

    const actionsEditor = document.getElementById('actionsEditor');
    actionsEditor.innerHTML = profile.actions.map((action, index) => `
      <div class="action-item" data-index="${index}">
        <div class="action-item-header">
          <span class="action-type">${action.type}</span>
          <button class="btn-remove-action" data-index="${index}">✕</button>
        </div>
        <div class="action-details">
          ${action.elementType || ''}${action.elementName ? ` [name="${action.elementName}"]` : ''}${action.elementId ? ` #${action.elementId}` : ''}
        </div>
        ${action.value !== undefined ? `
          <input type="text" class="action-value" data-index="${index}" value="${escapeHtml(action.value || '')}" placeholder="Value">
        ` : ''}
        ${action.checked !== undefined ? `
          <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
            <input type="checkbox" class="action-checked" data-index="${index}" ${action.checked ? 'checked' : ''}>
            <span style="font-size: 13px;">Checked</span>
          </label>
        ` : ''}
      </div>
    `).join('');

    // Add event listeners for remove buttons
    actionsEditor.querySelectorAll('.btn-remove-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        editingProfile.actions.splice(index, 1);
        editProfile(profileId); // Re-render
      });
    });

    // Show modal
    document.getElementById('editModal').style.display = 'flex';
  } catch (error) {
    console.error('Error editing profile:', error);
    showError('Failed to edit profile');
  }
}

// Save edited profile
async function saveEditedProfile() {
  if (!editingProfile) return;

  const name = document.getElementById('editProfileName').value.trim();

  if (!name) {
    showError('Please enter a profile name');
    return;
  }

  // Update action values from inputs
  document.querySelectorAll('.action-value').forEach(input => {
    const index = parseInt(input.dataset.index);
    if (editingProfile.actions[index]) {
      editingProfile.actions[index].value = input.value;
    }
  });

  // Update checked states
  document.querySelectorAll('.action-checked').forEach(checkbox => {
    const index = parseInt(checkbox.dataset.index);
    if (editingProfile.actions[index]) {
      editingProfile.actions[index].checked = checkbox.checked;
    }
  });

  editingProfile.name = name;
  editingProfile.updatedAt = Date.now();

  try {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    const index = profiles.findIndex(p => p.id === editingProfile.id);

    if (index >= 0) {
      profiles[index] = editingProfile;
      await chrome.storage.local.set({ profiles: profiles });

      closeModal();
      await loadProfiles();
      showSuccess('Profile updated successfully!');
    }
  } catch (error) {
    console.error('Error saving edited profile:', error);
    showError('Failed to save changes');
  }
}

// Delete profile
async function deleteProfile(profileId) {
  if (!confirm('Are you sure you want to delete this profile?')) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    const filtered = profiles.filter(p => p.id !== profileId);

    await chrome.storage.local.set({ profiles: filtered });
    await loadProfiles();

    showSuccess('Profile deleted');
  } catch (error) {
    console.error('Error deleting profile:', error);
    showError('Failed to delete profile');
  }
}

// Close modal
function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  editingProfile = null;
}

// Update UI for recording state
function updateUIForRecording(actionCount) {
  document.getElementById('recordBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('recordingInfo').style.display = 'block';
  document.getElementById('actionCount').textContent = actionCount;
  document.getElementById('currentUrl').textContent = currentTab?.url?.substring(0, 40) + '...' || '-';
  document.getElementById('saveSection').style.display = 'none';
}

// Update UI for stopped state
function updateUIForStopped() {
  document.getElementById('recordBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('recordingInfo').style.display = 'none';
}

// Set status text
function setStatus(text, state = 'ready') {
  const statusText = document.getElementById('statusText');
  const statusIndicator = document.getElementById('statusIndicator');

  statusText.textContent = text;

  // Remove all status classes
  statusIndicator.classList.remove('status-ready', 'status-recording', 'status-replaying');

  // Add appropriate class
  statusIndicator.classList.add(`status-${state}`);
}

// Action count updater
let actionCountInterval = null;

function startActionCountUpdater() {
  stopActionCountUpdater();

  actionCountInterval = setInterval(async () => {
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getRecordingStatus' });
      if (response && response.isRecording) {
        document.getElementById('actionCount').textContent = response.actionCount;
      }
    } catch (error) {
      // Ignore errors
    }
  }, 500);
}

function stopActionCountUpdater() {
  if (actionCountInterval) {
    clearInterval(actionCountInterval);
    actionCountInterval = null;
  }
}

// Ensure content script is injected
async function ensureContentScript() {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    console.log('Injecting content script');
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    });

    // Wait a bit for script to initialize
    await sleep(100);
  }
}

// Show error message
function showError(message) {
  setStatus(message, 'ready');
  setTimeout(() => {
    setStatus('Ready', 'ready');
  }, 3000);
}

// Show success message
function showSuccess(message) {
  setStatus(message, 'ready');
  setTimeout(() => {
    setStatus('Ready', 'ready');
  }, 2000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
