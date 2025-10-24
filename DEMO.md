# 🎬 OAuth Doctor - Demo Script

This document provides a structured demo script for presenting OAuth Doctor.

## 🎯 Demo Flow (5 minutes)

### Introduction (30 seconds)
"OAuth Doctor is a Chrome extension that helps Salesforce developers and users troubleshoot OAuth flows in real-time. It analyzes permission scopes, highlights security risks, and provides instant error diagnosis."

### Demo 1: Scope Analysis (2 minutes)

**Setup:**
1. Open `test.html` in Chrome
2. Scroll to "Test 2: Simulated OAuth Authorization Page"
3. Click the OAuth Doctor extension icon

**Actions:**
1. Click "Analyze Current Page"
2. Watch the overlay appear with scope analysis

**Talking Points:**
- "Notice the color-coded risk levels"
- "Red circles indicate high-risk permissions like 'full' access"
- "Orange shows refresh_token - long-term access"
- "Green indicates safer scopes like 'openid' and 'email'"
- "Each scope includes a plain-English description"
- "The warning banner appears when dangerous permissions are detected"

**Key Message:** "Users can now make informed decisions about what permissions they're granting."

### Demo 2: Error Diagnosis (2 minutes)

**Setup:**
1. On `test.html`, scroll to "Test 1: OAuth Error Detection"

**Actions:**
1. Click "Redirect URI Mismatch" test link
2. Watch the overlay appear immediately

**Talking Points:**
- "OAuth Doctor automatically detected the error in the URL"
- "Instead of a cryptic error code, users get a clear explanation"
- "Step-by-step instructions show exactly how to fix it"
- "No more searching through documentation"

**Try Another:**
1. Click "Invalid Grant" test link
2. Show different fix instructions

**Key Message:** "Developers save hours of debugging time with instant, actionable solutions."

### Demo 3: Real-World Usage (30 seconds)

**Talking Points:**
- "Works automatically on any Salesforce OAuth page"
- "No configuration needed"
- "Supports production and sandbox environments"
- "Handles 10+ common OAuth error types"

## 🎪 Alternative Demo Scenarios

### Scenario A: Security-Focused Demo
**Audience:** Security teams, administrators

1. Show high-risk scope detection
2. Emphasize the warning system
3. Demonstrate how users are empowered to review permissions
4. Show the comprehensive scope database

**Message:** "OAuth Doctor improves your organization's security posture by educating users at the point of decision."

### Scenario B: Developer-Focused Demo
**Audience:** Developers, technical teams

1. Show multiple error types
2. Emphasize time savings
3. Demonstrate fix instructions
4. Show console logging and technical details

**Message:** "OAuth Doctor eliminates the most time-consuming part of OAuth debugging."

### Scenario C: Support Team Demo
**Audience:** Support teams, help desk

1. Show how non-technical users can self-diagnose
2. Demonstrate clear explanations
3. Show how it reduces ticket volume
4. Emphasize the user-friendly interface

**Message:** "OAuth Doctor reduces support tickets by enabling self-service troubleshooting."

## 📊 Key Statistics to Mention

- **10+ error types** supported with detailed fixes
- **30+ OAuth scopes** analyzed and categorized
- **4 risk levels** for comprehensive security assessment
- **0 data collection** - completely privacy-focused
- **Automatic detection** - no user action required

## 🎨 Visual Highlights

Point out these UI/UX features:
- ✨ **Smooth animations** - professional and polished
- 🎨 **Beautiful gradient design** - modern and appealing
- 🎯 **Color-coded badges** - instant visual feedback
- 📱 **Responsive layout** - works on any screen size
- 🚫 **Non-intrusive** - easy to dismiss, doesn't block workflow

## 🏆 Value Propositions

### For Users:
- "Know exactly what you're authorizing"
- "Understand security risks before clicking 'Allow'"
- "Fix errors without contacting support"

### For Developers:
- "Debug OAuth issues in seconds, not hours"
- "Clear, actionable error messages"
- "Reduce time spent on OAuth configuration"

### For Organizations:
- "Reduce support ticket volume"
- "Improve security awareness"
- "Enhance developer productivity"

## 💡 Demo Tips

1. **Keep browser window large** - the overlay looks best with good visibility
2. **Have test.html bookmarked** - quick access during demo
3. **Pre-load the extension** - don't install during demo
4. **Show console logs** - for technical audiences
5. **Have a real Salesforce org ready** - in case you want to show live OAuth flow

## 🎤 Elevator Pitch (30 seconds)

"OAuth Doctor is like having an expert OAuth consultant right in your browser. When you encounter a Salesforce authorization page, it instantly analyzes the requested permissions, color-codes them by risk level, and warns you about dangerous scopes. When something goes wrong, it explains the error in plain English and tells you exactly how to fix it. It's the essential tool for any Salesforce ecosystem."

## ❓ Anticipated Questions

**Q: Does it work with other OAuth providers besides Salesforce?**  
A: Currently it's optimized for Salesforce, but the architecture supports extending to other providers.

**Q: Does it collect any data?**  
A: No, OAuth Doctor processes everything locally in your browser. Zero data collection.

**Q: Can I customize the risk levels?**  
A: Not in v1.0, but this is a planned feature for future releases.

**Q: What browsers does it support?**  
A: All Chromium-based browsers: Chrome, Edge, Brave, Opera.

**Q: How do I install it?**  
A: Currently it's available as a developer extension. See INSTALLATION.md for details.

## 🎬 Closing Statement

"OAuth Doctor makes the Salesforce ecosystem healthier by empowering users with knowledge, saving developers time, and reducing support burden. It's not just a debugging tool - it's a security education platform that works right when you need it."

---

**Remember:** Enthusiasm is contagious! Show genuine excitement about solving real pain points.

