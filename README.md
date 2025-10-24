# 🩺 OAuth Doctor - Salesforce OAuth Troubleshooter

A Chrome extension that helps Salesforce developers and users troubleshoot OAuth flows by analyzing permission scopes and diagnosing authorization errors in real-time.

## ✨ Features

### 🔍 Smart Scope Analysis
- **Automatic Detection**: Detects Salesforce OAuth authorization pages automatically
- **Risk-Level Color Coding**: Visually highlights permissions by risk level
  - 🔴 **High Risk**: Full access scopes (e.g., `full`, `web`)
  - 🟠 **Medium-High Risk**: Long-term access (e.g., `refresh_token`, `offline_access`)
  - 🟡 **Medium Risk**: Standard API access (e.g., `api`, `chatter_api`)
  - 🟢 **Low Risk**: Read-only and limited scopes (e.g., `openid`, `profile`, `email`)
  - ⚪ **Unknown**: Unrecognized scopes that need review

### ⚕️ Instant Error Diagnosis
- **Error Detection**: Automatically detects OAuth errors in URL parameters
- **Plain-English Explanations**: Translates cryptic error codes into understandable messages
- **Actionable Fixes**: Provides step-by-step instructions to resolve issues

**Supported Error Types:**
- `redirect_uri_mismatch` - Callback URL configuration issues
- `invalid_client_id` - Consumer Key problems
- `invalid_client` - Client authentication failures
- `invalid_grant` - Token expiration or revocation
- `invalid_request` - Missing or malformed parameters
- `unauthorized_client` - OAuth flow configuration issues
- `access_denied` - User or admin denial
- `unsupported_response_type` - Invalid response type
- `invalid_scope` - Scope configuration errors
- `server_error` - Salesforce platform issues

### 🎨 Beautiful UI
- Modern, gradient design with smooth animations
- Non-intrusive overlay that can be dismissed easily
- Mobile-responsive and accessible
- Dark semi-transparent backdrop for focus

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd oauth-doctor
   ```

2. **Create icon files** (if not present)
   - Place 16x16, 48x48, and 128x128 PNG icons in the `icons/` folder
   - Name them: `icon16.png`, `icon48.png`, `icon128.png`
   - Use a medical/stethoscope theme to match the branding

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `oauth-doctor` directory
   - The extension should now appear in your extensions list

4. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "OAuth Doctor" and click the pin icon
   - The extension icon will now be visible in your toolbar

## 📖 How to Use

### Automatic Analysis

1. **Navigate to any Salesforce OAuth authorization page**
   - The extension automatically detects OAuth flows
   - An overlay appears showing scope analysis and risk assessment

2. **Review the scope analysis**
   - See which permissions are being requested
   - Understand the risk level of each permission
   - Make informed decisions about approval

3. **If errors occur**
   - The extension automatically detects OAuth errors
   - View plain-English explanations
   - Follow step-by-step fixes

### Manual Analysis

1. **Click the extension icon** in your Chrome toolbar
2. **Click "Analyze Current Page"** button
3. The extension will analyze the current page for OAuth data

## 🎯 Use Cases

### For Developers
- **Debug OAuth Configuration**: Quickly identify mismatched redirect URIs, invalid client IDs, and scope issues
- **Reduce Support Tickets**: Users can self-diagnose common OAuth problems
- **Security Auditing**: Review what permissions your applications request
- **Education**: Learn about different OAuth scopes and their implications

### For End Users
- **Security Awareness**: Understand what permissions you're granting
- **Risk Assessment**: See color-coded risk levels before approving
- **Troubleshooting**: Get help when authorization fails

### For Administrators
- **Compliance**: Monitor OAuth permission requests
- **User Education**: Help users make informed security decisions
- **Security Posture**: Identify applications requesting excessive permissions

## 🏗️ Technical Architecture

### File Structure
```
oauth-doctor/
├── manifest.json          # Extension configuration
├── content.js            # Main content script (OAuth detection & analysis)
├── background.js         # Service worker (tab monitoring)
├── popup.html           # Extension popup UI
├── popup.js             # Popup functionality
├── styles.css           # Overlay and UI styles
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentation
```

### How It Works

1. **Content Script Injection**: `content.js` is injected into all Salesforce domains
2. **OAuth Detection**: Monitors page URLs and DOM for OAuth authorization pages
3. **Scope Extraction**: Parses URL parameters and page content to extract requested scopes
4. **Risk Analysis**: Compares scopes against a comprehensive risk database
5. **Error Detection**: Checks URL for OAuth error parameters
6. **UI Overlay**: Creates a beautiful modal overlay with analysis results
7. **Background Monitoring**: Service worker monitors tab updates for OAuth flows

### Permissions

- `activeTab`: Access the current tab's content
- `storage`: Store user preferences (future feature)
- Host permissions: Access to Salesforce domains for content script injection

## 🔒 Privacy & Security

- **No Data Collection**: OAuth Doctor does NOT collect, store, or transmit any user data
- **Local Processing**: All analysis happens locally in your browser
- **No External Requests**: No calls to external servers or analytics
- **Open Source**: Full source code available for review
- **Minimal Permissions**: Only requests necessary permissions for functionality

## 🛠️ Development

### Prerequisites
- Chrome browser (or Chromium-based browser)
- Basic knowledge of JavaScript and Chrome Extension APIs

### Local Development
1. Make changes to the source files
2. Navigate to `chrome://extensions/`
3. Click the refresh icon on the OAuth Doctor card
4. Test your changes on Salesforce OAuth pages

### Testing URLs
- **Production**: `https://login.salesforce.com/services/oauth2/authorize?...`
- **Sandbox**: `https://test.salesforce.com/services/oauth2/authorize?...`
- **Error Testing**: Add `?error=redirect_uri_mismatch` to any URL

### Adding New Scopes
Edit `content.js` and add entries to the `SCOPE_RISK_LEVELS` object:
```javascript
'new_scope': {
  level: 'medium',
  description: 'Description of what this scope does',
  color: '#ffc107'
}
```

### Adding New Error Types
Edit `content.js` and add entries to the `ERROR_EXPLANATIONS` object:
```javascript
'new_error_code': {
  title: 'Error Title',
  description: 'What this error means',
  fix: ['Step 1', 'Step 2', 'Step 3'],
  severity: 'error'
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Ideas for Future Enhancements
- [ ] Support for other OAuth providers (Google, Microsoft, etc.)
- [ ] History of analyzed OAuth requests
- [ ] Export analysis reports
- [ ] Custom scope risk profiles
- [ ] Dark mode toggle
- [ ] Multiple language support
- [ ] Integration with Salesforce Setup pages
- [ ] OAuth flow visualization
- [ ] JWT token decoder
- [ ] Session management tools

## 📜 License

MIT License - feel free to use and modify as needed.

## 🙏 Acknowledgments

- Built for the Salesforce developer community
- Inspired by common OAuth debugging challenges
- Designed to improve security awareness

## 📞 Support

If you encounter issues:
1. Check that you're on a valid Salesforce OAuth page
2. Verify the extension is enabled in `chrome://extensions/`
3. Check the browser console for error messages
4. Try disabling other extensions that might conflict

## 🎉 Why OAuth Doctor is a Winner

✅ **Boosts Security**: Helps users make informed permission decisions  
✅ **Saves Time**: Cuts developer debugging time dramatically  
✅ **Reduces Support Load**: Self-service error diagnosis  
✅ **Better UX**: Beautiful, intuitive interface  
✅ **Production Ready**: Handles all major OAuth error scenarios  
✅ **Zero Dependencies**: Lightweight and fast  

---

**Made with ❤️ for the Salesforce ecosystem**

