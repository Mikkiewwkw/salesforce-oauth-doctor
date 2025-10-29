# 🐛 Debugging OAuth Doctor in Firefox

## Step 1: Check if Content Script is Running

1. Open Firefox Browser Console:
   - Press `Ctrl+Shift+J` (Windows/Linux)
   - Or `Cmd+Option+J` (Mac)

2. Look for these log messages:
   ```
   OAuth Doctor: Authorization page detected
   OAuth Doctor: Error detected
   OAuth Doctor: Scope analysis
   ```

3. **If you DON'T see any logs:**
   - Content script is not being injected
   - Go to Step 2

4. **If you see logs but no overlay:**
   - Check for JavaScript errors in console
   - Go to Step 3

---

## Step 2: Verify Extension is Loaded and Active

1. Go to: `about:debugging#/runtime/this-firefox`

2. Find "OAuth Doctor" in the list

3. Click **"Reload"** to reload the extension

4. Go back to: `http://localhost:8000/test.html`

5. Click a test link again

6. Check console again for logs

---

## Step 3: Test with Browser Console Open

Let's manually trigger the extension:

1. Open `http://localhost:8000/test.html`

2. Open Browser Console (`Cmd+Option+J`)

3. Click any Test 1 or Test 2 link

4. Watch the console - do you see:
   - Any logs from "OAuth Doctor"?
   - Any JavaScript errors?
   - Any CSP (Content Security Policy) errors?

---

## Step 4: Manual Test in Console

With browser console open on the test page, paste this:

```javascript
// Check if content script loaded
console.log('Testing OAuth Doctor...');
console.log('Current URL:', window.location.href);
console.log('URL params:', window.location.search);

// Check if OAuth Doctor elements exist
console.log('OAuth Doctor overlay exists?', document.getElementById('oauth-doctor-overlay') !== null);
```

---

## Step 5: Check Extension Permissions

1. Go to: `about:addons`

2. Find "OAuth Doctor"

3. Click on it

4. Check **Permissions** section - should show:
   - Access your data for sites in the salesforce.com domain
   - Access your data for localhost

5. If localhost permission is missing:
   - Extension needs to be reloaded
   - Go back to `about:debugging` and reload it

---

## Common Issues & Fixes

### Issue 1: No Console Logs at All
**Problem**: Content script not injecting

**Fix**:
1. Reload extension in `about:debugging`
2. Make sure you're on `http://localhost:8000/test.html` (not `file://`)
3. Check manifest.json has `http://localhost/*` in matches

### Issue 2: Console Shows Errors
**Problem**: JavaScript error preventing execution

**Fix**:
1. Share the error message
2. May need to fix a browser compatibility issue

### Issue 3: CSP Errors
**Problem**: Content Security Policy blocking scripts

**Fix**:
1. This shouldn't happen on test.html
2. May occur on real Salesforce pages
3. Extension should still work despite warning

### Issue 4: Extension Works on file:// but not localhost
**Problem**: Manifest doesn't include localhost

**Fix**: Already applied - manifest.json includes:
```json
"matches": [
  "http://localhost/*",
  "http://127.0.0.1/*"
]
```

---

## Quick Diagnostic Command

Paste this in Firefox console on test page:

```javascript
// Full diagnostic
console.log('=== OAuth Doctor Debug ===');
console.log('URL:', window.location.href);
console.log('Has error param?', new URLSearchParams(window.location.search).get('error'));
console.log('Has scope param?', new URLSearchParams(window.location.search).get('scope'));
console.log('OAuth overlay exists?', !!document.getElementById('oauth-doctor-overlay'));
console.log('Body classes:', document.body.className);
console.log('Extension injection check:', typeof chrome !== 'undefined' || typeof browser !== 'undefined');
```

---

## What to Report

If still not working, please share:

1. ✅ Which link you clicked (Test 1 or Test 2, which one)
2. ✅ Current URL in address bar after clicking
3. ✅ Any console log messages (especially "OAuth Doctor" ones)
4. ✅ Any error messages in console
5. ✅ Screenshot if helpful

---

## Expected Behavior

**When clicking Test 1 link (error):**
- URL changes to include `?error=redirect_uri_mismatch...`
- Console shows: "OAuth Doctor: Error detected"
- Overlay appears with red error box

**When clicking Test 2 link (scope):**
- URL changes to include `?scope=full+api...`
- Console shows: "OAuth Doctor: Authorization page detected"
- Overlay appears with scope analysis

---

## Emergency Fallback Test

If nothing works, try this simple test:

1. Visit any website: `https://example.com`
2. Manually add error to URL: `https://example.com/?error=test`
3. Click OAuth Doctor icon → "Analyze Current Page"
4. Should show error overlay

This tests if the extension works at all.

