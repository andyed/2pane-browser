
const rulesTextarea = document.getElementById('rules');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');
const minWidthCheck = document.getElementById('minWidthCheck');
const minWidthValue = document.getElementById('minWidthValue');

// Load saved options and display them
function restoreOptions() {
  chrome.storage.sync.get({
    autoSplitRules: [],
    minWidthEnabled: false,
    minWidthValue: 1200
  }, (items) => {
    rulesTextarea.value = items.autoSplitRules.join('\n');
    minWidthCheck.checked = items.minWidthEnabled;
    minWidthValue.value = items.minWidthValue;
    minWidthValue.disabled = !items.minWidthEnabled;
  });
}

// Save the options to chrome.storage.sync
function saveOptions() {
  const rules = rulesTextarea.value.split('\n').filter(rule => rule.trim() !== '');
  const minWidthEnabled = minWidthCheck.checked;
  const widthValue = parseInt(minWidthValue.value, 10);

  chrome.storage.sync.set({
    autoSplitRules: rules,
    minWidthEnabled: minWidthEnabled,
    minWidthValue: widthValue
  }, () => {
    // Update status to let user know options were saved.
    statusDiv.textContent = 'Options saved.';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 1500);
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
saveButton.addEventListener('click', saveOptions);

minWidthCheck.addEventListener('change', () => {
  minWidthValue.disabled = !minWidthCheck.checked;
});
