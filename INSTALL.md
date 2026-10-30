# YouTube Focus v0.3.0 — install this preview

1. Unzip **youtube-focus-easy-install-v0.3.0.zip** and keep the folder.
2. Open Chrome and type `chrome://extensions` in the address bar.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the extracted folder where you can see **manifest.json** directly. Do not select the ZIP itself.
6. Refresh your YouTube tab.
7. Open YouTube Focus from Chrome’s puzzle-piece Extensions menu.

Set a task and enter the reminder gap in **seconds** (10–3,600; default 45). Click **Save task & timer**. For two minutes, enter **120**.

**Scroll reminders** and **Hide distractions** have independent switches that save immediately. The timer is a minimum gap between scrolling reminders, NOT a repeating alarm while watching. The first scroll may remind immediately. Later reminders require another scroll after the gap.

Upgrading from an older version? To retain your settings, replace the extension files and copy the new icons folder in the SAME folder you loaded previously, click Reload on its extension card, and refresh YouTube. Loading a new folder may create a separate installation with separate settings.

This is an unpublished developer preview. Chrome Web Store publication is needed for a straightforward one-click consumer installation. No hosting server is needed.

Privacy: all settings stay in local Chrome extension storage. No analytics, accounts, network requests or remote code. Access is limited to desktop www.youtube.com. Privacy policy draft included.

Verification: JavaScript syntax and 14 unit tests passed. Browser fixture tests and live YouTube behavior have not been verified in this environment. YouTube layout changes may require selector maintenance.

**Hide comments** hides the comments section while **Hide distractions** is on; it never locks page scrolling. The new setting defaults on. Turn it off to read comments, or turn off Hide distractions to restore all hidden content.

Source/GitHub ZIP: the manifest is in the extension subfolder. Easy-install ZIP: the manifest is at the ZIP root.
