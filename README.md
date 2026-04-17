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

## Safari — Install & update (one-liner)

Safari extensions must be signed with your Apple Developer certificate — they can't be distributed as a pre-built binary. The `build-safari.sh` script handles everything: pull, build, sign, and install.

**First time — clone and build:**

```bash
git clone https://github.com/Kibson350/tab-out-kiran.git ~/tab-out && bash ~/tab-out/build-safari.sh
```

**After any commit — update:**

```bash
bash ~/tab-out/build-safari.sh
```

This will:
1. Pull latest from `main`
2. Build the Xcode project signed with your Apple Development certificate
3. Copy the app to `/Applications` and restart it

**After running it:**
1. Open Safari → Settings → Extensions → enable **Tab Out**
2. Go to **Develop → Allow Unsigned Extensions**

> **Note:** If you don't see a Develop menu, go to Safari → Settings → Advanced → check "Show features for web developers"

> **Note:** `build-safari.sh` has a hardcoded certificate hash — if you're setting this up on a different machine, replace the `CODE_SIGN_IDENTITY` value in the script with your own certificate hash from `security find-identity -p codesigning -v`

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

## How updates work

Commit and push to `main`, then run `bash ~/tab-out/build-safari.sh`. The script pulls the latest, rebuilds, and reinstalls — one command for the full cycle.

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
