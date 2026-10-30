'use strict';
const enabled = document.querySelector('#enabled');
const hideComments = document.querySelector('#hideComments');
const remindersEnabled = document.querySelector('#remindersEnabled');
const reminderSeconds = document.querySelector('#reminderSeconds');
const task = document.querySelector('#task');
const status = document.querySelector('#status');
const save = document.querySelector('button');
chrome.storage.local.get({ enabled: true, hideComments: true, task: '', remindersEnabled: true, reminderSeconds: 45 }).then(value => {
  enabled.checked = value.enabled !== false;
  hideComments.checked = value.hideComments !== false;
  remindersEnabled.checked = value.remindersEnabled !== false;
  reminderSeconds.value = Number.isInteger(value.reminderSeconds) && value.reminderSeconds >= 10 && value.reminderSeconds <= 3600 ? value.reminderSeconds : 45;
  task.value = typeof value.task === 'string' ? value.task : '';
  enabled.disabled = hideComments.disabled = remindersEnabled.disabled = reminderSeconds.disabled = task.disabled = save.disabled = false;
  status.textContent = 'Your settings are ready.';
}).catch(() => { status.textContent = 'Could not load settings. Close and reopen this popup.'; });
for (const [control, key, label] of [[enabled, 'enabled', 'Distraction hiding'], [hideComments, 'hideComments', 'Comment hiding (when distraction hiding is on)'], [remindersEnabled, 'remindersEnabled', 'Scroll reminders']]) {
  control.addEventListener('change', async () => {
    control.disabled = true;
    try {
      await chrome.storage.local.set({ [key]: control.checked });
      status.textContent = `${label} ${control.checked ? 'on' : 'off'}.`;
    } catch { control.checked = !control.checked; status.textContent = 'Could not save. Please try again.'; }
    finally { control.disabled = false; }
  });
}
document.querySelector('#settings').addEventListener('submit', async event => {
  event.preventDefault();
  const seconds = Number(reminderSeconds.value);
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 3600) {
    status.textContent = 'Enter a whole number from 10 to 3,600 seconds.';
    reminderSeconds.focus();
    return;
  }
  save.disabled = true;
  try {
    await chrome.storage.local.set({ task: task.value.trim().slice(0, 160), reminderSeconds: seconds });
    status.textContent = `Saved. At most one reminder every ${seconds} seconds when you scroll${remindersEnabled.checked ? '.' : ' (reminders are off).'}`;
  } catch { status.textContent = 'Could not save. Please try again.'; }
  finally { save.disabled = false; }
});
