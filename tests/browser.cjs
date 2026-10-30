const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = path.join(__dirname, '..', 'extension');
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }); });
after(async () => { await browser?.close(); });
async function fixture(route = '/') {
  const page = await browser.newPage();
  await page.route('https://www.youtube.com/**', r => r.fulfill({contentType: 'text/html', body: `<!doctype html><html><body><input id="search"><div id="movie_player"><button>Play</button><video></video></div><ytd-browse page-subtype="home">Home recommendations</ytd-browse><ytd-watch-flexy><div id="related">Related</div></ytd-watch-flexy><ytd-reel-shelf-renderer>Shorts shelf</ytd-reel-shelf-renderer><ytd-shorts><video></video>Shorts</ytd-shorts><div class="ytp-ce-element">End card</div><ytd-comments id="comments">Comments</ytd-comments><ytd-video-renderer>Search result</ytd-video-renderer></body></html>`}));
  await page.goto(`https://www.youtube.com${route}`);
  await page.evaluate(() => {
    window.settings = { enabled: true, task: '' };
    window.listeners = [];
    window.chrome = { storage: { local: { get: async () => settings, set: async values => {
      const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { newValue }]));
      Object.assign(settings, values); listeners.forEach(fn => fn(changes, 'local'));
    } }, onChanged: { addListener: fn => listeners.push(fn) } } };
  });
  await page.addStyleTag({path: path.join(base, 'content.css')});
  await page.addScriptTag({path: path.join(base, 'content.js')});
  return page;
}
test('manifest is MV3 with only local storage and desktop YouTube access', () => {
  const m = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.permissions, ['storage']);
  assert.deepEqual(m.content_scripts[0].matches, ['https://www.youtube.com/*']);
  assert.equal(m.host_permissions, undefined);
});
test('hides recommendations and Shorts; preserves player and search; toggle reverses', async () => {
  const p = await fixture();
  for (const s of ['ytd-browse', '#related', 'ytd-reel-shelf-renderer', '.ytp-ce-element']) assert.equal(await p.locator(s).isVisible(), false, s);
  for (const s of ['#search', '#movie_player', 'ytd-video-renderer']) assert.equal(await p.locator(s).isVisible(), true, s);
  await p.evaluate(() => chrome.storage.local.set({enabled:false}));
  for (const s of ['ytd-browse', '#related', '.ytp-ce-element']) assert.equal(await p.locator(s).isVisible(), true, s);
  await p.close();
});
test('SPA navigation, back, and dynamically inserted suggestions work', async () => {
  const p = await fixture();
  const home = p.locator('#youtube-focus-ui .home');
  assert.equal(await home.isVisible(), true);
  await p.evaluate(() => { history.pushState({}, '', '/results?search_query=css'); dispatchEvent(new Event('yt-navigate-finish')); });
  assert.equal(await home.isVisible(), false);
  assert.equal(await p.locator('ytd-video-renderer').isVisible(), true);
  await p.evaluate(() => { const e = document.createElement('ytd-reel-shelf-renderer'); e.id = 'dynamic'; e.textContent = 'Shorts'; document.body.append(e); });
  assert.equal(await p.locator('#dynamic').isVisible(), false);
  await p.evaluate(() => { history.pushState({}, '', '/shorts/123'); dispatchEvent(new Event('yt-navigate-finish')); });
  assert.equal(await p.locator('ytd-shorts').isVisible(), false);
  assert.equal(await home.isVisible(), true);
  await p.goBack();
  await p.waitForFunction(() => document.documentElement.dataset.ytfocusRoute === 'other');
  assert.equal(await home.isVisible(), false);
  await p.close();
});
test('gentle reminders are throttled, dismissible, safe text and ignore player/editing', async () => {
  const p = await fixture('/watch?v=fixture');
  await p.clock.install({time: new Date('2026-01-01')});
  await p.evaluate(() => chrome.storage.local.set({task:'<img src=x onerror=alert(1)>'}));
  const toast = p.locator('#youtube-focus-ui .toast');
  await p.locator('#search').dispatchEvent('wheel', {deltaY:200});
  assert.equal(await toast.isVisible(), false);
  await p.locator('#movie_player button').dispatchEvent('keydown', {key:' '});
  assert.equal(await toast.isVisible(), false);
  await p.evaluate(() => dispatchEvent(new Event('scroll')));
  assert.equal(await toast.isVisible(), false);
  await p.locator('body').dispatchEvent('wheel', {deltaY:200});
  assert.equal(await toast.isVisible(), true);
  assert.match(await toast.textContent(), /<img src=x/);
  assert.equal(await toast.locator('img').count(), 0);
  await toast.locator('button').click();
  await p.locator('body').dispatchEvent('wheel', {deltaY:200});
  assert.equal(await toast.isVisible(), false);
  await p.clock.fastForward(45001);
  await p.locator('body').dispatchEvent('keydown', {key:'PageDown'});
  assert.equal(await toast.isVisible(), true);
  await p.clock.fastForward(8001);
  assert.equal(await toast.isVisible(), false);
  await p.clock.fastForward(45001);
  await p.evaluate(() => chrome.storage.local.set({remindersEnabled:false}));
  await p.locator('body').dispatchEvent('wheel', {deltaY:200});
  assert.equal(await toast.isVisible(), false);
  await p.close();
});
test('popup loads and saves task and enabled settings', async () => {
  const p = await fixture();
  await p.setContent(fs.readFileSync(path.join(base, 'popup.html'), 'utf8'));
  await p.addScriptTag({path:path.join(base, 'popup.js')});
  await p.locator('#task').fill('Read the tutorial');
  await p.locator('button').click();
  assert.equal(await p.evaluate(() => settings.task), 'Read the tutorial');
  await p.locator('#enabled').uncheck();
  assert.equal(await p.evaluate(() => settings.enabled), false);
  await p.close();
});

test('comment toggle hides only comments and focus off restores them', async () => {
  const p=await fixture('/watch?v=fixture');
  assert.equal(await p.locator('ytd-comments').isVisible(),false);
  assert.equal(await p.locator('#movie_player').isVisible(),true);
  await p.evaluate(() => chrome.storage.local.set({hideComments:false}));
  assert.equal(await p.locator('ytd-comments').isVisible(),true);
  await p.evaluate(() => chrome.storage.local.set({hideComments:true,enabled:false}));
  assert.equal(await p.locator('ytd-comments').isVisible(),true);
  await p.close();
});
