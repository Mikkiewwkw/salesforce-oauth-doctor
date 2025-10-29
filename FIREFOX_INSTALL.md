# 🦊 Firefox Installation Guide

## Quick Firefox Installation (3 Steps)

### Step 1: Backup Chrome Manifest
The extension folder contains two manifest files:
- `manifest.json` - For Chrome/Chromium browsers
- `manifest-firefox.json` - For Firefox

### Step 2: Swap Manifests for Firefox
```bash
# In the oauth-doctor directory, run:
mv manifest.json manifest-chrome.json
mv manifest-firefox.json manifest.json
```

Or manually:
1. Rename `manifest.json` to `manifest-chrome.json`
2. Rename `manifest-firefox.json` to `manifest.json`

### Step 3: Load in Firefox
1. Open Firefox
2. Type in address bar: `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on..."**
4. Navigate to the `oauth-doctor` folder
5. Select the `manifest.json` file
6. ✅ Extension loaded!

---

## 🧪 Test It

1. Open `test.html` in Firefox
2. Click any error link (e.g., "Redirect URI Mismatch")
3. OAuth Doctor overlay should appear! 🎉

---

## 🔄 Switch Back to Chrome

If you need to use Chrome later:
```bash
mv manifest.json manifest-firefox.json
mv manifest-chrome.json manifest.json
```

---

## ⚠️ Important Firefox Notes

### Temporary Add-on
- Firefox temporary add-ons are removed when you close Firefox
- You'll need to reload it each time you restart Firefox
- For permanent installation, you'd need to:
  1. Package as an XPI file
  2. Sign it with Mozilla (requires developer account)
  3. Or use Firefox Developer Edition with signing disabled

### Keep Extension Running
To keep the temporary add-on across Firefox restarts:
1. Use **Firefox Developer Edition** or **Firefox Nightly**
2. Type `about:config` in address bar
3. Search for `xpinstall.signatures.required`
4. Set to `false`
5. Now load as temporary add-on (will persist until manually removed)

---

## 🔧 Differences from Chrome Version

The Firefox version uses Manifest V2 because Firefox doesn't fully support Manifest V3 yet:

| Feature | Chrome (MV3) | Firefox (MV2) |
|---------|-------------|---------------|
| Background | `service_worker` | `scripts` array |
| Permissions | `host_permissions` | Combined in `permissions` |
| Action | `action` | `browser_action` |
| Browser API | `chrome.*` | `browser.*` or `chrome.*` |

The core functionality is identical - only the manifest format differs!

---

## 🐛 Troubleshooting

### Error: "background.service_worker is currently disabled"
✅ **Solution**: You're using the Chrome manifest. Follow Step 2 above to swap to Firefox manifest.

### Error: "Invalid extension ID"
✅ **Solution**: The Firefox manifest includes a unique ID. If you see this, the manifest is correct.

### Extension doesn't appear
✅ **Check**: 
- Visit a Salesforce OAuth page or open test.html
- Click the extension icon in Firefox toolbar
- Check Firefox Browser Console (Ctrl+Shift+J) for errors

### Overlay styling looks different
✅ **Note**: Firefox may render some CSS slightly differently than Chrome. The functionality remains the same.

---

## 📦 Automatic Switching Script

Create this helper script to switch between browsers:

```bash
#!/bin/bash
# save as: switch-browser.sh

if [ -f "manifest.json" ]; then
  # Check which version is active
  if grep -q "manifest_version\": 3" manifest.json; then
    echo "Switching to Firefox (Manifest V2)..."
    mv manifest.json manifest-chrome.json
    mv manifest-firefox.json manifest.json
    echo "✅ Ready for Firefox!"
  else
    echo "Switching to Chrome (Manifest V3)..."
    mv manifest.json manifest-firefox.json
    mv manifest-chrome.json manifest.json
    echo "✅ Ready for Chrome!"
  fi
else
  echo "❌ manifest.json not found!"
fi
```

Make it executable:
```bash
chmod +x switch-browser.sh
```

Run it:
```bash
./switch-browser.sh
```

---

## 🚀 Quick Command Summary

```bash
# Switch to Firefox
cd /Users/kaiweiwu/Documents/Dev/hackathon/oauth-doctor
mv manifest.json manifest-chrome.json
mv manifest-firefox.json manifest.json

# Open Firefox debugging page
open -a Firefox about:debugging#/runtime/this-firefox

# Or in Firefox address bar, type:
# about:debugging#/runtime/this-firefox
```

---

## ✅ Firefox Compatibility

**Tested Firefox Versions:**
- Firefox 78+ ✅
- Firefox Developer Edition ✅
- Firefox Nightly ✅

**Features Working:**
- ✅ OAuth page detection
- ✅ Scope analysis
- ✅ Error diagnosis
- ✅ Beautiful overlay UI
- ✅ Manual analysis trigger
- ✅ All core functionality

---

## 🎉 You're All Set!

The Firefox version works identically to the Chrome version. All features are fully functional!

For any issues, check the Browser Console (Ctrl+Shift+J) for error messages.

