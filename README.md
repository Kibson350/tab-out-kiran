# Tab Out

**Keep tabs on your tabs.**

Tab Out replaces your new tab page with a clean dashboard of everything you have open — grouped by domain, with one-click close, duplicate detection, save for later, and more.

Works in both **Chrome** and **Safari**.

---

## Features

- **See all your tabs at a glance** — clean grid grouped by domain
- **Homepages group** — Gmail, X, YouTube, LinkedIn, GitHub homepages in one card
- **Close tabs with style** — swoosh sound + confetti burst
- **Duplicate detection** — flags the same page open twice, one-click cleanup
- **Click any tab to jump to it** — works across windows
- **Save for later** — bookmark tabs to a checklist before closing
- **Restore archived tabs** — move completed items back to the active list
- **Localhost grouping** — shows port numbers so you can tell projects apart
- **100% local** — your data never leaves your machine

---

## Chrome — Manual Setup

**1. Clone the repo**

```bash
git clone https://github.com/Kibson350/tab-out-kiran.git
```

**2. Load the extension**

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

**3. Open a new tab** — you'll see Tab Out.

---

## Safari — Install from GitHub (one-liner)

Every push to `main` automatically builds a Safari extension DMG via GitHub Actions.

To install or update, paste this in Terminal:

```bash
curl -sL "$(curl -s https://api.github.com/repos/Kibson350/tab-out-kiran/releases/latest | grep -o 'https://[^"]*\.dmg' | head -1)" -o /tmp/TabOut.dmg && hdiutil attach -quiet /tmp/TabOut.dmg && cp -Rf "/Volumes/Tab Out/Tab Out.app" /Applications/ && hdiutil detach -quiet "/Volumes/Tab Out" && xattr -dr com.apple.quarantine "/Applications/Tab Out.app" && pkill -x "Tab Out" 2>/dev/null; open "/Applications/Tab Out.app" && echo "Tab Out updated"
```

This will:
1. Download the latest DMG from GitHub releases
2. Copy the app to `/Applications`
3. Strip the Gatekeeper quarantine flag (needed since it's ad-hoc signed)
4. Restart the app so Safari picks up the new extension

**After running it:**
1. Open Safari → Settings → Extensions
2. Enable **Tab Out**
3. Go to **Develop → Allow Unsigned Extensions** (re-enable after each Safari restart)

> **Note:** If you don't see a Develop menu in Safari, go to Safari → Settings → Advanced → check "Show features for web developers"

---

## Safari — Build from source (Xcode)

If you want to build the Safari extension yourself:

**1. Clone and convert**

```bash
git clone https://github.com/Kibson350/tab-out-kiran.git
cd tab-out-kiran
xcrun safari-web-extension-converter safari-extension/ \
  --project-location . \
  --app-name "Tab Out" \
  --bundle-identifier "com.tabout.extension" \
  --no-open
```

**2. Open in Xcode**

```bash
open "Tab Out/Tab Out.xcodeproj"
```

**3. Sign and run**

1. Select the `Tab Out (macOS)` scheme
2. For each target (Tab Out macOS + Tab Out Extension macOS): Signing & Capabilities → set your Apple ID as the Team
3. Hit **⌘R**

**4. Enable in Safari**

Safari → Settings → Extensions → enable **Tab Out**

---

## How auto-updates work

A GitHub Action (`.github/workflows/release.yml`) triggers on every push to `main`. It:
1. Builds the macOS Safari extension with Xcode
2. Packages it as a DMG
3. Publishes it to GitHub Releases as `latest`

The one-liner above always pulls from that `latest` release — so committing a change and running the command is all you need.

---

## Tech stack

| What | How |
|------|-----|
| Chrome extension | Manifest V3 |
| Safari extension | Safari Web Extension (Xcode wrapper) |
| Storage | `chrome.storage.local` / `browser.storage.local` |
| Sound | Web Audio API (synthesized, no files) |
| Animations | CSS transitions + JS confetti |
| Auto-build | GitHub Actions + `xcodebuild` |

---

## License

MIT
