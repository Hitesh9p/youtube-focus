const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'extension');
function harness() {
  class Element {
    constructor() { this.dataset = {}; this.hidden = true; this.textContent = ''; this.isConnected = false; this.events = {}; }
    addEventListener(name, fn) { this.events[name] = fn; }
    closest() { return this.editing ? this : null; }
    append(node) { node.isConnected = true; }
    attachShadow() { return { querySelector: selector => nodes[selector] }; }
  }
  class HTMLMediaElement extends Element { pause() { this.paused = true; } }
  const nodes = Object.fromEntries(['.home','.toast','[role="status"]','.task','button'].map(s => [s,new Element()]));
  const document = {documentElement: new Element(), hidden: false, createElement: () => new Element(), addEventListener: (n,fn) => events[n]=fn, querySelectorAll:()=>[]};
  const events = {}; let onChange; let now = 0; let timeout;
  const context = { document, location:{pathname:'/'}, Element, HTMLMediaElement, Date:{now:()=>now}, setTimeout:fn => {timeout=fn; return 1;}, clearTimeout:()=>{}, chrome:{storage:{local:{get:async()=>({enabled:true,task:''})},onChanged:{addListener:fn=>onChange=fn}}} };
  context.window = {addEventListener:(n,fn)=>events[n]=fn};
  vm.runInNewContext(fs.readFileSync(path.join(base,'content.js'),'utf8'), context);
  return {context,nodes,Element,HTMLMediaElement,fire:(name,event={})=>events[name]({target:new Element(),...event}), settings:(values)=>onChange(Object.fromEntries(Object.entries(values).map(([k,newValue])=>[k,{newValue}])), 'local'), tick:ms=>now+=ms, timeout:()=>timeout()};
}
test('minimal MV3 manifest and no remote runtime code', () => {
  const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
  assert.equal(m.manifest_version,3); assert.deepEqual(m.permissions,['storage']);
  assert.deepEqual(m.content_scripts[0].matches,['https://www.youtube.com/*']);
  for(const f of ['content.js','popup.js']) assert.doesNotMatch(fs.readFileSync(path.join(base,f),'utf8'), /\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(/);
});
test('default focus, task rendering, toggle and storage removal', async () => {
  const h=harness(); await Promise.resolve();
  assert.equal(h.context.document.documentElement.dataset.ytfocus,'on');
  h.settings({task:'<b>Learn</b>'}); assert.equal(h.nodes['.task'].textContent,'Your task: <b>Learn</b>');
  h.settings({enabled:false}); assert.equal(h.nodes['.home'].hidden,true);
  assert.equal(h.context.document.documentElement.dataset.ytfocus,'off');
  h.settings({enabled:undefined,task:undefined}); assert.equal(h.context.document.documentElement.dataset.ytfocus,'on');
  assert.equal(h.nodes['.task'].textContent,'One task at a time.');
});
test('SPA route changes and history restore home/shorts protection without hiding search', async () => {
  const h=harness(); await Promise.resolve();
  for(const [pathname,route,hidden] of [['/results','other',true],['/watch','other',true],['/shorts/123','shorts',false],['/','home',false]]) {
    h.context.location.pathname=pathname; h.fire('yt-navigate-finish');
    assert.equal(h.context.document.documentElement.dataset.ytfocusRoute,route); assert.equal(h.nodes['.home'].hidden,hidden);
  }
  h.context.location.pathname='/watch'; h.fire('popstate'); assert.equal(h.nodes['.home'].hidden,true);
});
test('scroll intent reminders throttle 45s, time out, dismiss, and respect disabled reminders', async () => {
  const h=harness(); await Promise.resolve();
  h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
  h.nodes.button.events.click(); assert.equal(h.nodes['.toast'].hidden,true);
  h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
  h.tick(45000); h.fire('keydown',{key:'PageDown'}); assert.equal(h.nodes['.toast'].hidden,false);
  h.timeout(); assert.equal(h.nodes['.toast'].hidden,true);
  h.settings({remindersEnabled:false}); h.tick(45000); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
});
test('player/editable controls and modified keys do not trigger reminders', async () => {
  const h=harness(); await Promise.resolve();
  const target = new h.Element(); target.editing=true;
  h.fire('wheel',{target,deltaY:500}); h.fire('keydown',{target,key:' '});
  h.fire('keydown',{key:'PageDown',ctrlKey:true}); assert.equal(h.nodes['.toast'].hidden,true);
});
test('Shorts playback is paused only on blocked Shorts routes', async () => {
  const h=harness(); await Promise.resolve(); const video=new h.HTMLMediaElement();
  h.fire('play',{target:video}); assert.equal(video.paused,undefined);
  h.context.location.pathname='/shorts/123'; h.fire('play',{target:video}); assert.equal(video.paused,true);
});
test('custom cooldown boundaries and interval changes apply live without reloading', async () => {
  const h=harness(); await Promise.resolve();
  h.settings({reminderSeconds:120}); h.fire('wheel',{deltaY:120}); h.nodes.button.events.click();
  h.tick(119999); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
  h.tick(1); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
  h.nodes.button.events.click(); h.settings({reminderSeconds:10}); h.tick(10000);
  h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
  h.nodes.button.events.click(); h.settings({reminderSeconds:3600}); h.tick(3599999);
  h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
  h.tick(1); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
});
test('reminders are independent of hiding; disabling dismisses immediately; re-enable preserves cooldown', async () => {
  const h=harness(); await Promise.resolve();
  h.settings({enabled:false}); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
  assert.equal(h.context.document.documentElement.dataset.ytfocus,'off');
  h.settings({enabled:true,remindersEnabled:false}); assert.equal(h.nodes['.toast'].hidden,true);
  assert.equal(h.context.document.documentElement.dataset.ytfocus,'on');
  h.tick(5000); h.settings({remindersEnabled:true}); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
  h.tick(40000); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
});
test('invalid or removed stored cooldown values fall back to 45 seconds', async () => {
  for(const reminderSeconds of [undefined,null,'120',NaN,Infinity,0,-1,9,3601,45.5]) {
    const h=harness(); await Promise.resolve(); h.settings({reminderSeconds});
    h.fire('wheel',{deltaY:120}); h.nodes.button.events.click(); h.tick(44999);
    h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,true);
    h.tick(1); h.fire('wheel',{deltaY:120}); assert.equal(h.nodes['.toast'].hidden,false);
  }
});
function popupHarness(initial={}) {
  const nodes=Object.fromEntries(['#enabled','#hideComments','#remindersEnabled','#reminderSeconds','#task','#status','button','#settings'].map(k=>[k,{events:{},value:'',addEventListener(n,f){this.events[n]=f;},focus(){this.focused=true;}}]));
  const stored={...initial};const writes=[];
  const context={document:{querySelector:s=>nodes[s]},chrome:{storage:{local:{get:async defaults=>({...defaults,...stored}),set:async value=>{Object.assign(stored,value);writes.push(value);}}}}};
  vm.runInNewContext(fs.readFileSync(path.join(base,'popup.js'),'utf8'),context);
  return {nodes,stored,writes,submit:()=>nodes['#settings'].events.submit({preventDefault(){}})};
}
test('popup keeps previous task/focus and defaults new options; persists custom timer and independent toggle', async () => {
  const h=popupHarness({task:'Learn CSS',enabled:false});await Promise.resolve();
  assert.equal(h.nodes['#task'].value,'Learn CSS');assert.equal(h.nodes['#enabled'].checked,false);
  assert.equal(h.nodes['#remindersEnabled'].checked,true);assert.equal(h.nodes['#reminderSeconds'].value,45);
  h.nodes['#reminderSeconds'].value='120';await h.submit();assert.equal(h.stored.reminderSeconds,120);assert.equal(h.stored.task,'Learn CSS');
  h.nodes['#remindersEnabled'].checked=false;await h.nodes['#remindersEnabled'].events.change();
  assert.equal(h.stored.remindersEnabled,false);assert.equal(h.stored.enabled,false);
  const reopened=popupHarness(h.stored);await Promise.resolve();assert.equal(reopened.nodes['#reminderSeconds'].value,120);assert.equal(reopened.nodes['#remindersEnabled'].checked,false);
});
test('popup rejects blank, fractional and out-of-range custom timers without saving', async () => {
  const h=popupHarness();await Promise.resolve();
  for(const value of ['', '9','3601','1.5','not a number']) {h.nodes['#reminderSeconds'].value=value;await h.submit();assert.equal(h.writes.length,0);}
  assert.equal(h.nodes['#reminderSeconds'].focused,true);
});
test('comments default to hidden on migration, toggle live, and restore when focus is off', async () => {
  const h=harness();await Promise.resolve();
  assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'hide');
  h.settings({hideComments:false});assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'show');
  h.settings({hideComments:true});assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'hide');
  h.settings({enabled:false});assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'show');
  h.settings({enabled:true});assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'hide');
  h.settings({hideComments:undefined});assert.equal(h.context.document.documentElement.dataset.ytfocusComments,'hide');
  const css=fs.readFileSync(path.join(base,'content.css'),'utf8');
  assert.match(css,/html\[data-ytfocus-comments="hide"\] ytd-comments#comments/);
  assert.doesNotMatch(css,/overflow\s*:\s*hidden/);
});
test('popup migrates comments default without losing task or timer and persists comment preference', async () => {
  const h=popupHarness({enabled:true,task:'Study',reminderSeconds:120,remindersEnabled:false});await Promise.resolve();
  assert.equal(h.nodes['#hideComments'].checked,true);
  h.nodes['#hideComments'].checked=false;await h.nodes['#hideComments'].events.change();
  assert.equal(h.stored.hideComments,false);assert.equal(h.stored.task,'Study');assert.equal(h.stored.reminderSeconds,120);assert.equal(h.stored.remindersEnabled,false);
  const reopened=popupHarness(h.stored);await Promise.resolve();assert.equal(reopened.nodes['#hideComments'].checked,false);
});
test('manifest and toolbar icons exist as PNGs with correct dimensions', () => {
  const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
  assert.equal(m.version,'0.3.0');
  for(const size of [16,32,48,128]) {
    assert.equal(m.icons[size],m.action.default_icon[size]);
    const png=fs.readFileSync(path.join(base,m.icons[size]));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  }
  assert.match(fs.readFileSync(path.join(base,'popup.html'),'utf8'),/icons\/owl-48.png/);
});
