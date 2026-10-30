# YouTube Focus 🦉

**Keep the video. Hide the distractions.**

A free, open-source Chrome extension that helps you use YouTube without getting pulled into endless browsing. No account or server needed. Your settings stay on your device.

## What it does

- Hides home recommendations, related videos, Shorts and end-screen suggestions.
- Lets you hide the comments section with a separate switch. Scrolling still works.
- Keeps search and normal videos available.
- Saves your task and gently reminds you when you try to scroll.
- Lets you turn reminders off or choose their minimum gap: **10–3,600 seconds**, default **45**.

The reminder timer is a **scroll-triggered cooldown**, not a repeating alarm while you watch. The first scroll can remind immediately; later reminders need another scroll after the gap. Hide comments starts on, but you can turn it off. Turning off **Hide distractions** restores comments too. Reminder controls are independent.

## Install this preview

**Version 0.3.0 — desktop Chrome, www.youtube.com only. Not on the Chrome Web Store yet.**

1. Download and unzip the easy-install ZIP.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose extension folder containing `manifest.json`.
4. Refresh YouTube. Open YouTube Focus from Chrome’s Extensions menu.
5. Set your task and timer, then click **Save task & timer**. Switches save immediately.

Using this source repository instead? Select its **extension** folder in step 3. Keep the installed folder on your computer. **Updating?** Copy the new extension files and icons folder into the same extension folder you loaded before, click Reload at `chrome://extensions`, then refresh YouTube. Do not remove/reinstall or load a second folder if you want to keep your settings. See [INSTALL.md](INSTALL.md).

## Privacy

No analytics, accounts, AI API, or outgoing requests. Only local settings storage and access to desktop YouTube. YouTube itself still follows its own data policies. See the [privacy policy draft](PRIVACY.md).

## A few limits

This is an early developer preview, not a complete content blocker. It does not disable autoplay, ads or every promotional surface. Mobile YouTube and embedded videos are not supported. YouTube changes its layout, so selectors may need updates. It reminds on wheel, touch or scrolling keys—not scrollbar dragging.

**Checks:** JavaScript syntax and 14 unit tests passed. Browser fixture tests and live YouTube have not been verified in the build environment. See [TESTING.md](TESTING.md) for the checklist.

## For contributors

No build step: Chrome loads `extension/` directly. Run `npm run check` and `npm test` (Node.js). Optional browser fixtures: `npm install`, then `CHROMIUM_PATH=/path/to/chromium npm run test:browser`. These fixtures mock Chrome storage and YouTube markup; they do not replace live testing.

Original owl logo: editable `extension/icons/owl.svg`, with PNG sizes for Chrome. MIT license. Independent project, not affiliated with YouTube or Google.

## One-line GitHub description

A lightweight Chrome extension that hides YouTube recommendations, Shorts and optional comments, with customizable scroll reminders to help you stay on task.
# youtube-focus
