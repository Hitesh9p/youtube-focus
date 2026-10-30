(() => {
  'use strict';
  const root = document.documentElement;
  let reminderSeconds = 45;
  let remindersEnabled = true;
  let enabled = true;
  let hideComments = true;
  let task = '';
  let lastReminder = -Infinity;
  let distance = 0;
  let touchY = null;
  let timer;
  const host = document.createElement('div');
  host.id = 'youtube-focus-ui';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; font: 16px/1.5 system-ui, sans-serif; color: #152e29; }
      [hidden] { display: none !important; }
      .home { position: fixed; top: 150px; left: max(270px, 25%); right: 24px; max-width: 600px; padding: 28px; border: 1px solid #b9d6cc; border-radius: 20px; background: #f4faf7; z-index: 100; }
      h1 { font-size: 26px; margin: 0 0 10px; } p { margin: 8px 0; }
      .toast { position: fixed; right: 24px; bottom: 28px; max-width: min(380px, calc(100vw - 96px)); padding: 20px; border-radius: 16px; box-shadow: 0 6px 28px #0003; background: #173f36; color: white; z-index: 2147483647; }
      button, a { font: inherit; } button { margin-top: 12px; padding: 7px 14px; border: 1px solid #bcd8cd; border-radius: 8px; background: #fff; color: #173f36; cursor: pointer; } a { color: #145b49; }
      button:focus-visible, a:focus-visible { outline: 3px solid #dfaa3a; outline-offset: 3px; }
      .task { overflow-wrap: anywhere; white-space: pre-wrap; }
      @media(max-width: 800px) { .home { left: 84px; top: 120px; padding: 20px; } }
    </style>
    <section class="home" hidden aria-label="YouTube Focus">
      <h1>Choose your video. Keep your focus.</h1>
      <p class="task"></p>
      <p>Recommendations and Shorts are hidden. Use YouTube’s search above to find what you need.</p>
      <p><a href="https://www.youtube.com/">Go to YouTube home</a></p>
      <p>Change your task or pause focus in the extension popup.</p>
    </section>
    <aside class="toast" hidden aria-label="Focus reminder">
      <div role="status" aria-live="polite" aria-atomic="true"></div>
      <button type="button">Got it</button>
    </aside>`;
  const home = shadow.querySelector('.home');
  const toast = shadow.querySelector('.toast');
  const status = shadow.querySelector('[role="status"]');
  function dismiss() { toast.hidden = true; status.textContent = ''; clearTimeout(timer); }
  shadow.querySelector('button').addEventListener('click', dismiss);
  function update() {
    const route = location.pathname === '/' ? 'home' : location.pathname.startsWith('/shorts') ? 'shorts' : 'other';
    root.dataset.ytfocus = enabled ? 'on' : 'off';
    root.dataset.ytfocusRoute = route;
    root.dataset.ytfocusComments = enabled && hideComments ? 'hide' : 'show';
    home.hidden = !enabled || route === 'other';
    shadow.querySelector('.task').textContent = task ? `Your task: ${task}` : 'One task at a time.';
    if (!remindersEnabled) dismiss();
    if (!host.isConnected) root.append(host);
    if (enabled && route === 'shorts') document.querySelectorAll('ytd-shorts video').forEach(video => video.pause());
  }
  function configure(value) {
    enabled = value.enabled !== false;
    hideComments = value.hideComments !== false;
    remindersEnabled = value.remindersEnabled !== false;
    reminderSeconds = Number.isInteger(value.reminderSeconds) && value.reminderSeconds >= 10 && value.reminderSeconds <= 3600 ? value.reminderSeconds : 45;
    distance = 0;
    task = typeof value.task === 'string' ? value.task.trim().slice(0, 160) : '';
    update();
  }
  function isEditing(target) {
    return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], #movie_player');
  }
  function remind(amount, event) {
    if (!remindersEnabled || document.hidden || isEditing(event.target) || host === event.target) return;
    distance += Math.abs(amount);
    if (distance < 100) return;
    distance = 0;
    const now = Date.now();
    if (now - lastReminder < reminderSeconds * 1000) return;
    lastReminder = now;
    toast.hidden = false;
    status.textContent = task ? `Stay with your task: ${task}` : 'Pause for a moment. Is this helping your task?';
    clearTimeout(timer);
    timer = setTimeout(dismiss, 8000);
  }
  // Listen to intent, not scroll events: layout changes and playback cannot trigger a reminder.
  window.addEventListener('wheel', event => remind(event.deltaY, event), { passive: true });
  window.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY ?? null; }, { passive: true });
  window.addEventListener('touchmove', event => {
    const next = event.touches[0]?.clientY;
    if (touchY !== null && next !== undefined) remind(touchY - next, event);
    touchY = next ?? null;
  }, { passive: true });
  window.addEventListener('touchend', () => { touchY = null; }, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.defaultPrevented) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)) remind(100, event);
    if (event.key === 'Escape') dismiss();
  });
  for (const name of ['yt-navigate-finish', 'yt-page-data-updated', 'popstate']) {
    window.addEventListener(name, () => { dismiss(); distance = 0; update(); });
  }
  document.addEventListener('play', event => {
    if (enabled && location.pathname.startsWith('/shorts') && event.target instanceof HTMLMediaElement) event.target.pause();
  }, true);
  update();
  chrome.storage.local.get({ enabled: true, hideComments: true, task: '', remindersEnabled: true, reminderSeconds: 45 }).then(configure).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    configure({
      enabled: changes.enabled ? changes.enabled.newValue : enabled,
      hideComments: changes.hideComments ? changes.hideComments.newValue : hideComments,
      task: changes.task ? changes.task.newValue : task,
      remindersEnabled: changes.remindersEnabled ? changes.remindersEnabled.newValue : remindersEnabled,
      reminderSeconds: changes.reminderSeconds ? changes.reminderSeconds.newValue : reminderSeconds
    });
  });
})();
