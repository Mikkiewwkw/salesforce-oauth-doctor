# 🚀 Quick Start Guide

Get OAuth Doctor running in 5 minutes!

## Step 1: Get Icon Files (2 minutes)

You need 3 icon files. Choose the easiest method:

### Option A: Download from Icons8 (Recommended)
1. Go to https://icons8.com/icons/set/stethoscope
2. Select a stethoscope icon you like
3. Download as PNG in 16px, 48px, and 128px sizes
4. Rename files to `icon16.png`, `icon48.png`, `icon128.png`
5. Place in the `icons/` folder

### Option B: Use Emoji Template (Fastest)
1. Open `emoji-icon-template.html` in Chrome
2. Right-click each icon and "Save Image As..."
3. Save with the correct filenames in `icons/` folder

### Option C: Quick Placeholder
For testing purposes, you can temporarily use any PNG images:
- Find any 3 PNG images
- Rename them to icon16.png, icon48.png, icon128.png  
- Place in `icons/` folder
- Update with proper icons later

## Step 2: Load Extension in Chrome (1 minute)

1. Open Chrome browser
2. Type `chrome://extensions/` in address bar
3. Enable **"Developer mode"** (top-right toggle)
4. Click **"Load unpacked"** button
5. Select the `oauth-doctor` folder
6. ✅ Extension is now installed!

## Step 3: Test It (2 minutes)

### Quick Test with Error Detection:
1. Open `test.html` file in Chrome
2. Click any error link (e.g., "Redirect URI Mismatch")
3. 🎉 OAuth Doctor overlay should appear with diagnosis!

### Test Manual Analysis:
1. Stay on `test.html`
2. Click the OAuth Doctor extension icon in toolbar
3. Click "Analyze Current Page"
4. Review the scope analysis

## 🎊 You're Done!

OAuth Doctor is now active and will automatically:
- ✅ Detect Salesforce OAuth pages
- ✅ Analyze permission scopes
- ✅ Diagnose OAuth errors
- ✅ Provide actionable fixes

## 🆘 Troubleshooting

**Extension won't load:**
- Make sure all files are in the `oauth-doctor` folder
- Check that icon files exist in `icons/` folder
- Look for errors in `chrome://extensions/`

**Overlay doesn't appear:**
- Check that you're on a page with OAuth data
- Try clicking extension icon → "Analyze Current Page"
- Open browser console (F12) to check for errors

**Icons missing error:**
- Follow Step 1 above to add icon files
- Or temporarily remove icon references from manifest.json

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Check [DEMO.md](DEMO.md) for presentation ideas
- Try on real Salesforce OAuth flows
- Share with your team!

## 🔗 Useful Links

- **Salesforce OAuth Docs**: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_authenticate.htm
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
- **Icons8** (for icons): https://icons8.com/icons/set/stethoscope

---

**Need help?** Check the detailed [INSTALLATION.md](INSTALLATION.md) guide.

