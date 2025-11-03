# 🩺 OAuth Doctor - Salesforce OAuth Security Analyzer

**AI-powered browser extension for analyzing Salesforce OAuth flows and diagnosing authorization errors**

![Version](https://img.shields.io/badge/version-2.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Browser](https://img.shields.io/badge/browser-Firefox%20%7C%20Chrome-orange)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Files](#files)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

OAuth Doctor is a browser extension designed for Salesforce developers and administrators to:

1. **Analyze OAuth Scopes** - Understand what permissions an app is requesting during authorization
2. **Diagnose OAuth Errors** - Get instant troubleshooting advice when OAuth flows fail
3. **Security Analysis** - Detect suspicious permission patterns and security risks
4. **AI-Powered Insights** - Get contextual explanations using Salesforce LLM Gateway (Claude Sonnet 4)

The extension automatically detects Salesforce OAuth flows and injects a non-intrusive popup with security analysis and recommendations.

---

## ✨ Features

### 🔍 OAuth Scope Analysis
- **Automatic Scope Detection** - Extracts scopes from URL parameters or page content
- **Risk Scoring** - Each scope is scored from 1-10 based on security impact
- **Risk Categories** - CRITICAL, HIGH, MEDIUM-HIGH, MEDIUM, MEDIUM-LOW, LOW
- **Overall Risk Assessment** - Provides a summary recommendation (Approve/Deny)
- **Scope Explanations** - Plain-English descriptions of what each permission allows

### 🚨 Security Anomaly Detection
- **Full Access Detection** - Alerts when an app requests complete control
- **Multiple High-Risk Permissions** - Flags apps requesting many dangerous scopes
- **Persistent Broad Access** - Detects refresh_token + api/full combinations
- **Excessive Scope Count** - Warns when apps request too many permissions
- **PII Collection Patterns** - Identifies comprehensive personal data harvesting
- **Positive Patterns** - Recognizes good security practices (least privilege)

### 🔧 OAuth Error Diagnosis
- **Common Error Detection** - Recognizes 20+ common OAuth errors
- **Instant Troubleshooting** - Provides step-by-step fix instructions
- **Error Context** - Explains what went wrong and why
- **Best Practices** - Offers recommendations to prevent future errors

### 🤖 AI-Powered Analysis (Optional)
- **Enhanced Security Insights** - AI-powered anomaly detection
- **Personalized Troubleshooting** - Context-aware error analysis
- **Scope Explanations** - AI-generated plain-English explanations
- **Multiple AI Models** - Supports Claude, Gemini, GPT models
- **Lazy Loading** - AI analysis only runs when you click "Analyze with AI"

---

## 📥 Installation

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the extension directory and select `manifest.json`
4. The extension icon (🩺) will appear in your toolbar

### Chrome/Edge

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension directory
5. The extension icon (🩺) will appear in your toolbar

### Post-Installation

1. Click the OAuth Doctor icon (🩺) in your toolbar
2. (Optional) Configure AI by selecting a model and entering your API key
3. Navigate to any Salesforce OAuth page to see it in action!

---

## 🚀 Usage

### Analyzing OAuth Scopes

1. Navigate to a Salesforce OAuth authorization page (e.g., `/services/oauth2/authorize`)
2. The OAuth Doctor popup will automatically appear in the top-right corner
3. View the **Security Analysis** section for anomaly detection
4. Expand **OAuth Scope Details** to see each permission
5. Click "Security expert explains" or "AI explains" for detailed explanations
6. Check the **Approval Recommendation** before authorizing

### Diagnosing OAuth Errors

1. When an OAuth error occurs (on `/services/oauth2/authorize` or `/services/oauth2/token`)
2. The OAuth Doctor popup will automatically appear with:
   - Error title and description
   - Step-by-step fix instructions
   - Option to get AI-enhanced troubleshooting
3. Follow the recommended steps to resolve the error

### Using AI Analysis

#### For Scope Analysis:
1. Check the **"🤖 Use AI-Powered Analysis"** checkbox at the top
2. The Security Analysis section will update with AI insights
3. Click **"AI explains"** buttons for AI-generated scope explanations

#### For Error Analysis:
1. Check the **"🤖 Use AI-Enhanced Troubleshooting"** checkbox
2. Wait for personalized troubleshooting advice
3. View AI-powered analysis based on your specific error

---

## 🏗️ Architecture

### Extension Components

```
oauth-doctor/
├── manifest.json          # Extension configuration
├── content.js             # Main logic (scope & error analysis)
├── background.js          # AI API communication
├── popup.html             # Configuration UI
├── popup-config.js        # Configuration logic
├── styles.css             # Popup styles
└── icons/                 # Extension icons
```

### Code Flow

```
1. User visits Salesforce OAuth page
   ↓
2. content.js detects OAuth flow
   ↓
3. Extract scopes/errors from page
   ↓
4. Analyze using rule-based system
   ↓
5. Display popup with results
   ↓
6. (Optional) User enables AI
   ↓
7. background.js calls LLM API
   ↓
8. Display AI insights
```

---

## ⚙️ Configuration

### AI Setup (Optional)

1. Click the OAuth Doctor icon (🩺) in your toolbar
2. Select your preferred AI model:
   - **Claude Sonnet 4** (Recommended) - Best balance of speed and quality
   - **Claude 3.7 / 3.5** - Alternative Claude versions
   - **Gemini 2.5 Pro / Flash** - Google's models
   - **GPT-4o / GPT-4o Mini** - OpenAI models
3. Enter your **LLM_GW_EXPRESS_KEY** (Salesforce internal)
4. Click "Save API Key"

**Note**: AI analysis is completely optional. The extension works fully without it using rule-based analysis.

### API Key Storage

- Your API key is stored **locally** in browser storage
- It is **never** sent anywhere except the Salesforce LLM Gateway
- You can clear it anytime by removing the key and saving

---

## 📁 Files

### Core Files

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| **content.js** | Main Orchestration | ~2500 | Detects OAuth flows, coordinates analysis, creates UI |
| **background.js** | AI Communication | ~245 | Handles AI API calls to Salesforce LLM Gateway |
| **popup-config.js** | Configuration | ~199 | Manages API key and model selection |
| **popup.html** | Configuration UI | ~196 | Extension configuration interface |
| **styles.css** | Popup Styles | ~653 | CSS for the analysis popup |
| **manifest.json** | Extension Config | ~47 | Extension metadata and permissions |

### Modular Components (New!)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| **utils.js** | Common Utilities | ~173 | Shared functions: HTML escaping, page detection, AI calls, loading popups |
| **scope-analyzer.js** | Scope Analysis | ~394 | Scope extraction, risk scoring, anomaly detection, expert explanations |
| **error-analyzer.js** | Error Analysis | ~334 | Error detection from URL/XML/JSON, troubleshooting guidance |

**Note**: The modular components (`utils.js`, `scope-analyzer.js`, `error-analyzer.js`) have been created for better code organization and maintainability. Currently, `content.js` contains all functionality. Future versions will migrate to the modular architecture.

---

## 🔧 Development

### Modifying the Extension

1. **Edit Core Logic**: Modify `content.js`
   - Scope extraction: `extractScopes()` function
   - Risk analysis: `analyzeScopes()` function
   - Anomaly detection: `detectAnomalies()` function
   - UI creation: `createAnalyzerOverlay()` function

2. **Edit AI Integration**: Modify `background.js`
   - AI model configuration: `callAI()` function
   - LLM Gateway endpoint: Update URL in fetch call

3. **Edit Configuration UI**: Modify `popup.html` and `popup-config.js`

4. **Edit Styles**: Modify `styles.css`

### Testing Changes

1. Make your changes
2. Firefox: Reload extension in `about:debugging`
3. Chrome: Click reload button in `chrome://extensions/`
4. Navigate to a Salesforce OAuth page to test

### Adding New OAuth Errors

Edit the `ERROR_PATTERNS` object in `content.js`:

```javascript
'your_error_code': {
  title: 'Error Title',
  description: 'What went wrong',
  fix: [
    'Step 1 to fix',
    'Step 2 to fix'
  ],
  category: 'CONFIG_ERROR'
}
```

### Adding New Scope Risk Levels

Edit the `SCOPE_RISK_LEVELS` object in `content.js`:

```javascript
'your_scope_name': {
  level: 'HIGH',
  score: 8,
  description: 'What this scope allows',
  color: '#f57c00'
}
```

---

## 🐛 Troubleshooting

### Extension Not Detecting OAuth Pages

**Issue**: Popup doesn't appear on Salesforce OAuth pages

**Solutions**:
1. Check that the URL contains `/services/oauth2/authorize` or `/services/oauth2/token`
2. Reload the extension
3. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
4. Check browser console for errors (F12)

### Scopes Not Showing

**Issue**: "No scopes detected" message appears

**Solutions**:
1. Check that the URL has a `scope` parameter
2. Wait a moment for the page to fully load
3. The extension will attempt to parse scopes from page content
4. Check console for "OAuth Doctor: Final extracted scopes" message

### AI Analysis Not Working

**Issue**: AI checkbox does nothing or shows errors

**Solutions**:
1. Verify your API key is saved (click extension icon)
2. Check that you have network connectivity
3. View background script console:
   - Firefox: `about:debugging` → This Firefox → Inspect
   - Chrome: `chrome://extensions/` → Background Page → Console
4. Look for error messages from the LLM Gateway

### Security Analysis Section Empty

**Issue**: Security Analysis container shows but is empty

**Solutions**:
1. This usually means no anomalies were detected (which is good!)
2. You should see "No Security Concerns Detected" message
3. If completely empty, check console for errors
4. The extension may still be loading - wait a moment

---

## 📊 Scope Risk Levels

| Level | Score | Examples | Description |
|-------|-------|----------|-------------|
| CRITICAL | 10 | `full` | Complete access to everything |
| HIGH | 7-8 | `api`, `refresh_token`, `web` | Broad data access or long-term tokens |
| MEDIUM-HIGH | 6 | `einstein_gpt_api`, `cdp_api` | Sensitive AI or customer data access |
| MEDIUM | 4-5 | `profile`, `email`, `address` | Personal information access |
| MEDIUM-LOW | 4 | `custom_permissions`, `chatter_api` | Feature-specific access |
| LOW | 2-3 | `id`, `chatbot_api`, `forgot_password` | Limited or specialized access |

---

## 🤝 Contributing

This extension was built as an internal Salesforce hackathon project. While not currently open for external contributions, feedback and bug reports are welcome!

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Authors

Built with ❤️ by the Salesforce OAuth Security Team

---

## 🎓 Learn More

- [Salesforce OAuth Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [Salesforce LLM Gateway](https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl)

---

**Version 2.3** | Last Updated: 2025-11-02
