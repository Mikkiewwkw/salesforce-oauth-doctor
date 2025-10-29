# 🧪 Testing OAuth Doctor in Firefox

## Quick Fix for Local File Testing

### Option 1: Enable File Access (Recommended for Testing)

The manifest has been updated to support `file://` URLs, but Firefox requires an additional step:

1. **After loading the extension**, go to:
   ```
   about:addons
   ```

2. Find "OAuth Doctor" in your extensions list

3. Click on it to open details

4. Scroll down to **"Optional permissions"** or look for file access settings

5. **IMPORTANT**: Unfortunately, Firefox doesn't show a toggle for file:// access in temporary add-ons

### Option 2: Use a Local Web Server (Best for Testing)

Since Firefox temporary add-ons don't support file:// access easily, serve the test page via HTTP:

#### Using Python (Easiest)
```bash
# In the oauth-doctor directory
cd /Users/kaiweiwu/Documents/Dev/hackathon/oauth-doctor

# Python 3
python3 -m http.server 8000

# Then open in Firefox:
# http://localhost:8000/test.html
```

#### Using Node.js
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 8000

# Then open: http://localhost:8000/test.html
```

#### Using PHP
```bash
php -S localhost:8000

# Then open: http://localhost:8000/test.html
```

### Option 3: Test on Real URLs

Instead of using test.html locally, test with URLs that have error parameters:

1. **Open a real website** (any site will do for testing errors)

2. **Add error parameters** to the URL:
   ```
   https://example.com/?error=redirect_uri_mismatch&error_description=test
   ```

3. **Click extension icon** → "Analyze Current Page"

4. OAuth Doctor should detect and display the error!

---

## 🚀 Quick Test with Local Server (RECOMMENDED)

```bash
# 1. Start server
cd /Users/kaiweiwu/Documents/Dev/hackathon/oauth-doctor
python3 -m http.server 8000

# 2. Open Firefox to:
# http://localhost:8000/test.html

# 3. Click any error link - it should work now!
```

---

## ✅ Updating Manifest to Allow localhost

The manifest needs to include localhost for the server approach:

Already included in the updated manifest:
- `file:///*` - for local file testing (limited in Firefox)
- Works automatically with `http://localhost:*` when served

---

## 🧪 Alternative: Test with Real Salesforce OAuth

If you have a Salesforce Developer account:

1. **Create a Connected App**:
   - Go to Setup → App Manager → New Connected App
   - Enable OAuth Settings
   - Add callback: `https://example.com`
   - Select some scopes

2. **Build OAuth URL**:
   ```
   https://login.salesforce.com/services/oauth2/authorize?client_id=YOUR_CONSUMER_KEY&redirect_uri=https://example.com&response_type=code&scope=api%20refresh_token%20full%20openid
   ```

3. **Visit that URL** - OAuth Doctor will automatically analyze it!

---

## 🐛 Troubleshooting

### "Could not analyze this page"
**Cause**: Extension can't access file:// URLs in Firefox temporary add-ons

**Solutions**:
1. ✅ Use local web server (Option 2 above)
2. ✅ Test with http://localhost URLs
3. ✅ Test with real Salesforce OAuth pages

### Content script not injecting
**Check**: Open Firefox Browser Console (Ctrl+Shift+J)
- Should see: "OAuth Doctor: ..." logs if working
- If not, content script isn't running on that page

### Extension icon is grayed out
**Normal**: Extension only activates on Salesforce domains or when manually triggered

---

## 💡 Best Testing Workflow for Firefox

1. **Start local server**:
   ```bash
   cd /Users/kaiweiwu/Documents/Dev/hackathon/oauth-doctor
   python3 -m http.server 8000
   ```

2. **Open test page**:
   ```
   http://localhost:8000/test.html
   ```

3. **Test features**:
   - Click error links → Should see diagnosis overlay
   - Click extension icon → "Analyze Current Page"
   - Check Browser Console for logs

4. **For real testing**:
   - Use actual Salesforce OAuth URLs
   - See full functionality in action

---

## 🎯 What Should Work

Once you use the local server approach:

✅ Error detection (click error links on test page)
✅ Scope analysis (simulated auth page section)
✅ Manual analysis trigger (extension popup)
✅ Beautiful overlay UI
✅ All core functionality

---

## 📝 Quick Command Reference

```bash
# Start test server
cd /Users/kaiweiwu/Documents/Dev/hackathon/oauth-doctor
python3 -m http.server 8000

# In Firefox, open:
# http://localhost:8000/test.html

# Click any error link - OAuth Doctor should appear!
```

---

**TL;DR**: Firefox temporary add-ons don't work well with `file://` URLs. Use a local web server instead - it takes 10 seconds to set up and works perfectly! 🚀

