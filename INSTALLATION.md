# 📦 Installation Guide - OAuth Doctor

## Quick Start (3 Steps)

### Step 1: Get the Extension Files
You already have the extension files in your `oauth-doctor` directory.

### Step 2: Create Extension Icons
The extension needs three icon files. You can use any 🩺 stethoscope or medical-themed icons:

**Option A: Use an online icon generator**
1. Visit a site like [favicon.io](https://favicon.io/emoji-favicons/stethoscope/) or [icons8](https://icons8.com/)
2. Generate icons with sizes: 16x16, 48x48, and 128x128 pixels
3. Save them in the `icons/` folder as:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

**Option B: Quick placeholder icons**
Run this command to create simple colored placeholder icons:
```bash
# On macOS (requires Python with PIL/Pillow)
python3 create_icons.py
```

### Step 3: Load in Chrome
1. Open Chrome and go to: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `oauth-doctor` folder
5. ✅ Done! The extension is now active.

## 🧪 Test It Out

### Test 1: OAuth Authorization Page
1. Visit this test URL (you'll need a Salesforce Developer account):
   ```
   https://login.salesforce.com/services/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://example.com&response_type=code&scope=api%20refresh_token%20full
   ```
   
2. You should see the OAuth Doctor overlay appear automatically
3. It will show risk analysis of the scopes: `api`, `refresh_token`, and `full`

### Test 2: OAuth Error Detection
1. Visit this URL with an intentional error:
   ```
   https://example.com/?error=redirect_uri_mismatch&error_description=redirect_uri%20must%20match%20configuration
   ```

2. Open the extension popup
3. Click "Analyze Current Page"
4. You should see error diagnosis with fix instructions

### Test 3: Manual Analysis
1. Click the OAuth Doctor extension icon in your toolbar
2. Click "Analyze Current Page" on any Salesforce page
3. The extension will search for OAuth data

## 🎨 Customizing Icons

If you want to create custom icons:

### Using Figma/Canva
1. Create a 128x128px design with a medical theme
2. Export at 16x16, 48x48, and 128x128
3. Save as PNG with transparent background

### Suggested Colors
- Primary: `#667eea` (purple-blue)
- Secondary: `#764ba2` (purple)
- Or use medical red/white theme

### Icon Ideas
- 🩺 Stethoscope
- 🔬 Microscope
- 💊 Medical capsule
- ⚕️ Medical symbol
- 🏥 Hospital cross

## 🔧 Troubleshooting

### Extension doesn't load
- Check that all files are in the correct location
- Verify `manifest.json` is valid JSON
- Check Chrome console for errors (`chrome://extensions/` → Details → Errors)

### Icons missing error
- Create the three required PNG files in `icons/` folder
- Or temporarily remove icon references from `manifest.json`

### Extension not detecting OAuth pages
- Make sure you're on a Salesforce domain
- Check that content scripts are allowed to run
- Verify the URL matches patterns in manifest

### Overlay doesn't appear
- Open browser console (F12) and check for JavaScript errors
- Try clicking extension icon and "Analyze Current Page"
- Refresh the page

## 🚀 Next Steps

After installation:
1. Pin the extension to your toolbar for easy access
2. Read the main [README.md](README.md) for full feature documentation
3. Try it on real Salesforce OAuth flows
4. Share with your team!

## 📱 Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Opera
- ⚠️ Firefox (requires manifest conversion)

---

Need help? Check the main [README.md](README.md) for more details!

