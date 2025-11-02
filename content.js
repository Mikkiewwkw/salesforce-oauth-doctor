// OAuth Doctor - Content Script
// Detects OAuth flows and injects analysis UI

(function() {
  'use strict';

  // Scope risk mapping (using teammate's comprehensive system)
  const SCOPE_RISK_LEVELS = {
    // CRITICAL - Full access to everything
    'full': { level: 'CRITICAL', score: 10, description: 'Complete access to all data and operations', color: '#d32f2f' },
    
    // HIGH RISK - Broad API access or sensitive operations
    'api': { level: 'HIGH', score: 8, description: 'Full API access to read/write data', color: '#f57c00' },
    'refresh_token': { level: 'HIGH', score: 8, description: 'Long-term access without re-authentication', color: '#f57c00' },
    'offline_access': { level: 'HIGH', score: 8, description: 'Access when user is offline', color: '#f57c00' },
    'web': { level: 'HIGH', score: 7, description: 'Web-based access to user data', color: '#f57c00' },
    'visualforce': { level: 'HIGH', score: 7, description: 'Visualforce pages access', color: '#f57c00' },
    
    // MEDIUM-HIGH RISK - Specific sensitive APIs
    'cdp_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Customer Data Platform access', color: '#ff9800' },
    'cdp_ingest_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Ingest data into CDP', color: '#ff9800' },
    'cdp_profile_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Access customer profiles', color: '#ff9800' },
    'cdp_query_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Query CDP data', color: '#ff9800' },
    'einstein_gpt_api': { level: 'MEDIUM-HIGH', score: 6, description: 'AI/GPT functionality access', color: '#ff9800' },
    'wave_rest_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Analytics/Wave API access', color: '#ff9800' },
    
    // MEDIUM RISK - Profile and identity data
    'profile': { level: 'MEDIUM', score: 5, description: 'Access to user profile information', color: '#fbc02d' },
    'email': { level: 'MEDIUM', score: 5, description: 'Access to email address', color: '#fbc02d' },
    'address': { level: 'MEDIUM', score: 5, description: 'Access to physical address', color: '#fbc02d' },
    'phone': { level: 'MEDIUM', score: 5, description: 'Access to phone number', color: '#fbc02d' },
    'openid': { level: 'MEDIUM', score: 4, description: 'OpenID authentication', color: '#fbc02d' },
    
    // MEDIUM-LOW RISK - Feature-specific APIs
    'chatter_api': { level: 'MEDIUM-LOW', score: 4, description: 'Chatter social features access', color: '#afb42b' },
    'content': { level: 'MEDIUM-LOW', score: 4, description: 'Content management access', color: '#afb42b' },
    'lightning': { level: 'MEDIUM-LOW', score: 4, description: 'Lightning component access', color: '#afb42b' },
    'vf': { level: 'MEDIUM-LOW', score: 4, description: 'Visualforce pages access', color: '#afb42b' },
    'custom_permissions': { level: 'MEDIUM-LOW', score: 4, description: 'Custom permission access', color: '#afb42b' },
    'pardot_api': { level: 'MEDIUM-LOW', score: 4, description: 'Pardot marketing access', color: '#afb42b' },
    'interaction_api': { level: 'MEDIUM-LOW', score: 4, description: 'Interaction tracking access', color: '#afb42b' },
    
    // LOW RISK - Limited or specialized access
    'id': { level: 'LOW', score: 2, description: 'Basic identity information', color: '#7cb342' },
    'chatbot_api': { level: 'LOW', score: 3, description: 'Chatbot functionality access', color: '#7cb342' },
    'eclair_api': { level: 'LOW', score: 3, description: 'Eclair API access', color: '#7cb342' },
    'sfap_api': { level: 'LOW', score: 3, description: 'Salesforce API Platform access', color: '#7cb342' },
    'cdp_segment_api': { level: 'LOW', score: 3, description: 'CDP segmentation access', color: '#7cb342' },
    'cdp_identityresolution_api': { level: 'LOW', score: 3, description: 'Identity resolution access', color: '#7cb342' },
    'cdp_calculated_insight_api': { level: 'LOW', score: 3, description: 'Calculated insights access', color: '#7cb342' },
    'mcp_api': { level: 'LOW', score: 3, description: 'MCP API access', color: '#7cb342' },
    'pwdless_login_api': { level: 'LOW', score: 3, description: 'Passwordless login capability', color: '#7cb342' },
    'forgot_password': { level: 'LOW', score: 2, description: 'Password reset functionality', color: '#7cb342' },
    'user_registration_api': { level: 'LOW', score: 2, description: 'User registration capability', color: '#7cb342' }
  };

  // Common OAuth errors with explanations
  const ERROR_EXPLANATIONS = {
    'redirect_uri_mismatch': {
      title: 'Redirect URI Mismatch',
      description: 'The redirect URI in your request doesn\'t match the one configured in your Connected App.',
      fix: [
        'Go to Setup → App Manager → Your Connected App',
        'Edit OAuth settings',
        'Add the exact redirect URI to "Callback URL" field',
        'Remember: URLs are case-sensitive and must match exactly (including http/https, port, path)'
      ],
      severity: 'error'
    },
    'invalid_client_id': {
      title: 'Invalid Client ID',
      description: 'The consumer key (client_id) is incorrect or the Connected App doesn\'t exist.',
      fix: [
        'Verify the Consumer Key from Setup → App Manager → Your Connected App',
        'Ensure you copied the entire key without extra spaces',
        'Check if the Connected App is enabled',
        'Verify you\'re using the correct Salesforce org (production vs sandbox)'
      ],
      severity: 'error'
    },
    'invalid_client': {
      title: 'Invalid Client',
      description: 'The client authentication failed. This might be a problem with your client secret.',
      fix: [
        'Verify your Consumer Secret is correct',
        'Check if "Require Secret for Web Server Flow" is enabled when it shouldn\'t be',
        'Regenerate the Consumer Secret if compromised'
      ],
      severity: 'error'
    },
    'invalid_grant': {
      title: 'Invalid Grant',
      description: 'The authorization code or refresh token is invalid, expired, or already used.',
      fix: [
        'Authorization codes expire after 15 minutes - request a new one',
        'Each authorization code can only be used once',
        'For refresh tokens: they may have been revoked or expired',
        'Check if the user\'s password was changed (invalidates refresh tokens)'
      ],
      severity: 'error'
    },
    'unsupported_grant_type': {
      title: 'Unsupported Grant Type',
      description: 'The grant type you specified is not supported by this authorization server.',
      fix: [
        'For authorization code flow: use grant_type=authorization_code',
        'For refresh token flow: use grant_type=refresh_token',
        'For password flow: use grant_type=password',
        'Check for typos in the grant_type parameter',
        'Verify the OAuth flow is enabled in your Connected App settings'
      ],
      severity: 'error'
    },
    'invalid_request': {
      title: 'Invalid Request',
      description: 'The request is missing required parameters or has invalid values.',
      fix: [
        'Verify required parameters: response_type, client_id, redirect_uri',
        'Check for typos in parameter names',
        'Ensure proper URL encoding of parameter values',
        'Validate that response_type is "code" or "token"'
      ],
      severity: 'error'
    },
    'unauthorized_client': {
      title: 'Unauthorized Client',
      description: 'The client is not authorized to use this authorization grant type.',
      fix: [
        'Check OAuth flow settings in your Connected App',
        'Enable appropriate OAuth flows (Web Server, User-Agent, etc.)',
        'Verify "Selected OAuth Scopes" include what you\'re requesting'
      ],
      severity: 'error'
    },
    'access_denied': {
      title: 'Access Denied',
      description: 'The user or system administrator denied the authorization request.',
      fix: [
        'User clicked "Deny" on the authorization page',
        'Admin may have blocked the Connected App',
        'Check Setup → Connected Apps → Manage Connected Apps',
        'Verify OAuth policies and IP restrictions'
      ],
      severity: 'warning'
    },
    'unsupported_response_type': {
      title: 'Unsupported Response Type',
      description: 'The authorization server doesn\'t support this response type.',
      fix: [
        'Use "code" for Web Server Flow',
        'Use "token" for User-Agent Flow',
        'Check Connected App OAuth settings'
      ],
      severity: 'error'
    },
    'invalid_scope': {
      title: 'Invalid Scope',
      description: 'One or more requested scopes are invalid or not allowed.',
      fix: [
        'Check for typos in scope names',
        'Verify scopes are enabled in Connected App settings',
        'Some scopes require specific permissions or licenses',
        'Use space-separated scope values'
      ],
      severity: 'error'
    },
    'server_error': {
      title: 'Server Error',
      description: 'Salesforce encountered an internal error.',
      fix: [
        'Wait a few moments and try again',
        'Check Salesforce status at status.salesforce.com',
        'Review API limits and quotas',
        'Contact Salesforce support if persistent'
      ],
      severity: 'error'
    }
  };

  // Detect if we're on an OAuth authorization page
  function isOAuthAuthorizationPage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    // Check URL patterns for Salesforce OAuth pages
    if (url.includes('/services/oauth2/authorize') || 
        url.includes('/services/oauth2/token') ||
        path.includes('/setup/secur/remoteaccessauthorizationpage.apexp')) {
      console.log('OAuth Doctor: Detected Salesforce OAuth page by URL pattern');
      return true;
    }
    
    // Check if hostname contains "salesforce" (with various formats)
    const isSalesforceDomain = hostname.includes('salesforce') || 
                                hostname.includes('force.com') ||
                                hostname.includes('my.salesforce');
    
    // Check for OAuth approval elements
    const hasApprovalButton = document.querySelector('input[name="approve"], button[name="approve"], input[value="Allow"], input[value="Authorize"], button:contains("Allow"), button:contains("Authorize")');
    const hasDenyButton = document.querySelector('input[name="decline"], button[name="decline"], input[value="Deny"], button:contains("Deny")');
    const pageText = document.body.textContent.toLowerCase();
    const hasOAuthScope = pageText.includes('requesting access') || 
                          pageText.includes('will allow') ||
                          pageText.includes('this application will be able to') ||
                          pageText.includes('permissions');
    
    const hasOAuthElements = hasApprovalButton && (hasDenyButton || hasOAuthScope);
    
    if (isSalesforceDomain && hasOAuthElements) {
      console.log('OAuth Doctor: Detected Salesforce OAuth page by domain + elements');
      return true;
    }
    
    return hasOAuthElements;
  }

  // Extract scopes from URL or page content
  function extractScopes() {
    console.log('OAuth Doctor: Extracting scopes from page...');
    console.log('OAuth Doctor: Current URL:', window.location.href);
    const scopes = new Set();
    
    // Try to get from URL parameter first (THIS IS THE PRIMARY SOURCE)
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope');
    
    if (scopeParam) {
      console.log('OAuth Doctor: ✅ Found scope parameter in URL:', scopeParam);
      const urlScopes = scopeParam.split(/[\s,]+/).filter(s => s.trim());
      console.log('OAuth Doctor: URL scopes array:', urlScopes);
      urlScopes.forEach(scope => {
        const normalized = scope.toLowerCase().trim();
        scopes.add(normalized);
        console.log('OAuth Doctor: Added scope from URL:', normalized);
      });
      
      // If we got scopes from URL, return immediately - don't parse from page descriptions
      if (scopes.size > 0) {
        const scopesArray = Array.from(scopes);
        console.log('OAuth Doctor: ✅ Using scopes from URL (primary source):', scopesArray);
        return scopesArray;
      }
    } else {
      console.log('OAuth Doctor: ⚠️ No scope parameter found in URL, will parse from page content');
    }
    
    // Description-to-scope mapping for when URL doesn't have scope parameter
    const descriptionToScope = {
      'identity url': 'id',
      'openid': 'openid',
      'profile': 'profile',
      'email': 'email',
      'address': 'address',
      'phone': 'phone',
      'forgot password': 'forgot_password',
      'headless forgot password': 'forgot_password',
      'einstein gpt': 'einstein_gpt_api',
      'data cloud': 'cdp_api',
      'cdp': 'cdp_api',
      'custom permissions': 'custom_permissions',
      'web browsers': 'web',
      'manage user data via web': 'web',
      'chatbot': 'chatbot_api',
      'apis': 'api',
      'manage user data via apis': 'api',
      'perform requests at any time': 'refresh_token',
      'offline access': 'offline_access',
      'access your data': 'api',
      'visualforce': 'visualforce',
      'chatter': 'chatter_api',
      'content': 'content',
      'lightning': 'lightning'
    };
    
    // Try multiple selectors to find scope elements on the page (teammate's approach)
    const selectors = [
      '.contentDiv li',           // Salesforce classic
      '.scopesList li',
      '[id*="scope"] li',
      '.oauthScopes li',
      '[class*="scope"] li',
      '.permissionList li',
      'ul li',                     // Generic list items
      'div[class*="content"] li',
      '.slds-list li',            // Lightning Design System
      '.slds-scope li'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`OAuth Doctor: Found ${elements.length} elements with selector: ${selector}`);
          let selectorScopeCount = 0;
          elements.forEach((el, idx) => {
            let text = el.textContent.trim();
            console.log(`OAuth Doctor: Element ${idx} text:`, text);
            // Clean up text - remove extra descriptions
            text = text.split(/[:(]/)[0].trim();
            
            // Only add if it looks like a scope (reasonable length, no full sentences)
            if (text && text.length > 0 && text.length < 200) {
              const normalized = text.toLowerCase();
              console.log(`OAuth Doctor: Normalized text:`, normalized);
              
              let matched = false;
              
              // First, try to match against description mapping
              for (const [description, scopeName] of Object.entries(descriptionToScope)) {
                if (normalized.includes(description)) {
                  console.log(`OAuth Doctor: ✅ Matched description "${text}" to scope "${scopeName}"`);
                  scopes.add(scopeName);
                  selectorScopeCount++;
                  matched = true;
                  break;
                }
              }
              
              // If not matched by description, try direct scope name matching
              if (!matched) {
                const normalizedUnderscore = normalized.replace(/\s+/g, '_');
                for (const knownScope of Object.keys(SCOPE_RISK_LEVELS)) {
                  if (normalizedUnderscore.includes(knownScope.replace(/-/g, '_')) || knownScope.includes(normalizedUnderscore)) {
                    console.log(`OAuth Doctor: ✅ Matched "${text}" to known scope "${knownScope}"`);
                    scopes.add(knownScope);
                    selectorScopeCount++;
                    matched = true;
                    break;
                  }
                }
              }
              
              // Also add the raw text if it looks like a scope name (not a sentence)
              if (!matched && text.match(/^[a-zA-Z_]+$/)) {
                console.log(`OAuth Doctor: ✅ Adding raw scope "${text}"`);
                scopes.add(text.toLowerCase());
                selectorScopeCount++;
                matched = true;
              }
              
              if (!matched) {
                console.log(`OAuth Doctor: ❌ Skipped "${text}" (no match)`);
              }
            } else {
              console.log(`OAuth Doctor: ❌ Skipped element ${idx} - invalid text`);
            }
          });
          if (selectorScopeCount > 0) {
            console.log(`OAuth Doctor: Selector "${selector}" found ${selectorScopeCount} scopes. Total so far:`, Array.from(scopes));
            break; // Found scopes, no need to try other selectors
          }
        }
      } catch (e) {
        console.log(`OAuth Doctor: Selector failed: ${selector}`, e);
      }
    }
    
    // Fallback: search for specific patterns in text
    if (scopes.size === 0) {
      console.log('No scopes found in lists, searching in page text...');
      const bodyText = document.body.innerText.toLowerCase();
      const scopeKeywords = Object.keys(SCOPE_RISK_LEVELS);
      
      scopeKeywords.forEach(scope => {
        // Check for scope name with word boundaries
        const regex = new RegExp(`\\b${scope.replace(/_/g, '[_\\s-]')}\\b`, 'i');
        if (regex.test(bodyText)) {
          scopes.add(scope);
        }
      });
    }
    
    const scopesArray = Array.from(scopes);
    console.log('OAuth Doctor: Final extracted scopes:', scopesArray);
    return scopesArray;
  }

  // Analyze scopes and categorize by risk (teammate's system with scores)
  function analyzeScopes(scopes) {
    console.log('OAuth Doctor: analyzeScopes called with scopes:', scopes);
    const analyses = scopes.map(scope => {
      const normalized = scope.toLowerCase().replace(/[^a-z_]/g, '_');
      console.log('OAuth Doctor: Analyzing scope:', scope, '-> normalized:', normalized);
      
      // Try exact match first
      for (const [key, risk] of Object.entries(SCOPE_RISK_LEVELS)) {
        if (normalized.includes(key.replace(/-/g, '_'))) {
          console.log('OAuth Doctor: ✅ Matched scope', scope, 'to', key, '- Level:', risk.level, 'Score:', risk.score);
          return { scope: scope, ...risk };
        }
      }
      
      // Default for unknown scopes
      console.log('OAuth Doctor: ⚠️  Unknown scope:', scope);
      return {
        scope: scope,
        level: 'UNKNOWN',
        score: 5,
        description: 'Unknown scope - review manually',
        color: '#9e9e9e'
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
    
    console.log('OAuth Doctor: analyzeScopes returning', analyses.length, 'analyses:', analyses);
    return analyses;
  }
  
  // Calculate overall risk score (teammate's algorithm)
  function calculateOverallRisk(analyses) {
    if (analyses.length === 0) return { level: 'NONE', score: 0, color: '#4caf50' };
    
    const avgScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
    const maxScore = Math.max(...analyses.map(a => a.score));
    
    if (maxScore >= 9) return { level: 'CRITICAL', score: maxScore, color: '#d32f2f' };
    if (maxScore >= 7) return { level: 'HIGH', score: maxScore, color: '#f57c00' };
    if (avgScore >= 5) return { level: 'MEDIUM', score: avgScore.toFixed(1), color: '#ff9800' };
    if (avgScore >= 3) return { level: 'LOW', score: avgScore.toFixed(1), color: '#7cb342' };
    return { level: 'MINIMAL', score: avgScore.toFixed(1), color: '#4caf50' };
  }
  
  // Call Salesforce LLM Gateway for AI analysis (teammate's implementation)
  async function callAI(prompt, systemPrompt, specificModel = null) {
    try {
      // Get configuration from storage
      const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
      const result = await browserAPI.storage.local.get(['sfLlmApiKey', 'aiModel']);
      const apiKey = result.sfLlmApiKey;
      const model = specificModel || result.aiModel || 'claude-sonnet-4-20250514';
      
      if (!apiKey) {
        console.log('AI not available (no API key)');
        return null;
      }
      
      console.log(`Calling Salesforce LLM Gateway API for AI analysis with model: ${model}...`);
      
      const requestBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500
      };
      
      // Some models don't support temperature parameter
      if (!model.startsWith('gpt-5')) {
        requestBody.temperature = 0.7;
      }
      
      const response = await fetch('https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Salesforce LLM Gateway error:', errorText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log('AI response received (length:', data.choices[0].message.content.length, 'chars)');
        return data.choices[0].message.content;
      } else {
        console.error('Unexpected response structure:', data);
        return null;
      }
    } catch (error) {
      console.error('Error calling AI:', error);
      return null;
    }
  }

  // Get AI-powered anomaly detection (teammate's implementation)
  async function getAIAnomalyDetection(scopes) {
    const systemPrompt = `You are a cybersecurity expert specializing in OAuth security. 
Analyze OAuth scope combinations for suspicious patterns, security risks, and anomalies.
Provide your analysis in JSON format with this structure:
{
  "anomalies": [
    {
      "severity": "CRITICAL_RISK|HIGH_RISK|MEDIUM_RISK|LOW_RISK|GOOD_PRACTICE",
      "icon": "appropriate emoji (🔴 for critical, 🟠 for high, 🟡 for medium, 🔵 for low, ✅ for good)",
      "title": "Brief, clear title (max 50 chars)",
      "message": "User-friendly explanation in plain English (2-3 sentences max)",
      "recommendation": "Specific actionable advice",
      "color": "hex color code (#dc2626 for critical, #f97316 for high, #fbbf24 for medium, #3b82f6 for low, #10b981 for good)"
    }
  ]
}

SEVERITY GUIDELINES:
- CRITICAL_RISK: Extremely dangerous (full access, admin rights)
- HIGH_RISK: Serious security concern (broad data access, refresh tokens with wide scope)
- MEDIUM_RISK: Moderate concern (specific sensitive data access)
- LOW_RISK: Minor concern worth noting
- GOOD_PRACTICE: Positive security pattern (minimal permissions, least privilege)`;

    const prompt = `Analyze these Salesforce OAuth scopes for security risks and anomalies:
${scopes.join(', ')}

Look for:
1. Excessive permissions (full access, too many high-risk scopes)
2. Dangerous combinations (refresh_token + broad access)
3. Data collection patterns (PII harvesting)
4. Unusual scope counts
5. Positive patterns (minimal permissions)

Return ONLY valid JSON, no additional text.`;

    const response = await callAI(prompt, systemPrompt);
    
    if (response) {
      try {
        // Try to parse the JSON response directly first
        const parsed = JSON.parse(response);
        console.log('AI anomaly detection successful, count:', parsed.anomalies?.length);
        return parsed.anomalies || [];
      } catch (e) {
        // Try to extract JSON from markdown or other wrappers
        try {
          let jsonStr = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const match = jsonStr.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            console.log('AI anomaly detection successful (extracted), count:', parsed.anomalies?.length);
            return parsed.anomalies || [];
          }
        } catch (extractError) {
          console.error('Failed to parse AI anomaly response:', extractError);
        }
      }
    }
    
    return null;
  }

  // Get AI-powered scope explanation (teammate's implementation)
  async function getAIScopeExplanation(scopeName) {
    const systemPrompt = `You are a security educator explaining OAuth permissions to non-technical users.
Explain the scope in simple, relatable terms using this JSON structure:
{
  "plainEnglish": "One sentence analogy anyone can understand",
  "whatItMeans": "What the app can actually do with this permission",
  "alternatives": "What to consider or ask before approving",
  "realWorld": "Real-world comparison or example"
}`;

    const prompt = `Explain this Salesforce OAuth scope: ${scopeName}

Make it understandable for someone who is not a developer. Use clear analogies.
Return ONLY valid JSON, no additional text.`;

    const response = await callAI(prompt, systemPrompt);
    
    if (response) {
      try {
        const parsed = JSON.parse(response);
        return parsed;
      } catch (e) {
        try {
          let jsonStr = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const match = jsonStr.match(/\{[\s\S]*\}/);
          if (match) {
            return JSON.parse(match[0]);
          }
        } catch (extractError) {
          console.error('Failed to parse AI scope explanation:', extractError);
        }
      }
    }
    
    return null;
  }

  // Detect anomalies in scope combinations (rule-based fallback)
  function detectAnomalies(analyses) {
    console.log('OAuth Doctor: detectAnomalies called with analyses:', analyses);
    const anomalies = [];
    const scopeNames = analyses.map(a => a.scope.toLowerCase());
    console.log('OAuth Doctor: Scope names for anomaly detection:', scopeNames);
    
    // Anomaly 1: FULL access requested
    if (scopeNames.some(s => s.includes('full'))) {
      anomalies.push({
        severity: 'CRITICAL',
        icon: '🚨',
        title: 'FULL Access Detected',
        message: 'This app requests COMPLETE control over your Salesforce org. This is extremely rare and potentially dangerous.',
        recommendation: 'DENY unless you absolutely trust this publisher and understand why full access is needed.',
        color: '#d32f2f'
      });
    }
    
    // Anomaly 2: Too many high-risk scopes
    const highRiskScopes = analyses.filter(a => a.score >= 7);
    const highRiskCount = highRiskScopes.length;
    console.log('OAuth Doctor: High-risk scopes (score >= 7):', highRiskScopes);
    console.log('OAuth Doctor: High-risk count:', highRiskCount);
    if (highRiskCount >= 3) {
      console.log('OAuth Doctor: ✅ Multiple High-Risk Permissions anomaly detected');
      anomalies.push({
        severity: 'HIGH',
        icon: '⚠️',
        title: 'Multiple High-Risk Permissions',
        message: `This app requests ${highRiskCount} high-risk scopes. Most apps need only 1-2 high-risk permissions.`,
        recommendation: 'Review each scope carefully. Consider contacting the app publisher to understand why so many permissions are needed.',
        color: '#f57c00'
      });
    } else {
      console.log('OAuth Doctor: ❌ Multiple High-Risk Permissions anomaly NOT detected (need 3+, have ' + highRiskCount + ')');
    }
    
    // Anomaly 3: Refresh token + Full/API (persistent broad access)
    const hasRefreshToken = scopeNames.some(s => s.includes('refresh') || s.includes('offline'));
    const hasBroadAccess = scopeNames.some(s => s.includes('full') || s.includes('api'));
    if (hasRefreshToken && hasBroadAccess) {
      anomalies.push({
        severity: 'HIGH',
        icon: '🔓',
        title: 'Persistent Broad Access Combination',
        message: 'The app is requesting both long-term access (refresh_token/offline_access) AND broad data permissions (full/api).',
        recommendation: 'Only approve if the app needs to perform automated operations on your behalf 24/7.',
        color: '#f57c00'
      });
    }
    
    // Anomaly 4: Excessive scope count
    if (analyses.length > 8) {
      anomalies.push({
        severity: 'MEDIUM',
        icon: '📊',
        title: 'Unusually High Number of Scopes',
        message: `This app requests ${analyses.length} different permissions. The average app requests 3-5 scopes.`,
        recommendation: 'Verify this is a complex app that genuinely needs all these permissions.',
        color: '#ff9800'
      });
    }
    
    // Anomaly 5: Sensitive data access pattern (Profile + Email + Address + Phone)
    const hasPII = ['profile', 'email', 'address', 'phone'].filter(s => 
      scopeNames.some(scope => scope.includes(s))
    ).length;
    if (hasPII >= 3) {
      anomalies.push({
        severity: 'MEDIUM',
        icon: '👤',
        title: 'Comprehensive Personal Data Collection',
        message: `This app is collecting ${hasPII} types of personal information (profile, email, address, phone). This creates a detailed personal profile.`,
        recommendation: 'Verify the app has a clear privacy policy and legitimate need for your personal information.',
        color: '#ff9800'
      });
    }
    
    // Anomaly 6: Only low-risk scopes (good pattern!)
    const maxRisk = Math.max(...analyses.map(a => a.score));
    if (maxRisk <= 4 && analyses.length > 0) {
      anomalies.push({
        severity: 'POSITIVE',
        icon: '✅',
        title: 'Limited Permissions (Good Sign)',
        message: 'This app only requests low-risk permissions. This is a good security practice by the developer.',
        recommendation: 'This is a positive indicator. The app is following the principle of least privilege.',
        color: '#4caf50'
      });
    }
    
    console.log('OAuth Doctor: detectAnomalies returning', anomalies.length, 'anomalies:', anomalies);
    return anomalies;
  }
  
  // Get expert explanation for a scope (teammate's knowledge base)
  function getExpertExplanation(scopeName) {
    const expertExplanations = {
      'full': {
        plainEnglish: "This is like giving someone the master key to your entire Salesforce organization",
        whatItMeans: "The app can read, modify, and delete ALL your data, including sensitive customer information, financial records, and system settings",
        alternatives: "Most apps only need 'api' scope. Ask yourself: does this app really need complete control?",
        realWorld: "Similar to giving someone admin access to your entire computer"
      },
      'api': {
        plainEnglish: "The app can read and write most of your Salesforce data through the API",
        whatItMeans: "Access to contacts, accounts, opportunities, and custom objects. Can create, update, and delete records",
        alternatives: "If the app only displays data, consider if read-only access would work",
        realWorld: "Like giving someone permission to edit your Google Docs"
      },
      'refresh_token': {
        plainEnglish: "The app can access your data anytime, even when you're not actively using it",
        whatItMeans: "Creates a long-lived token that doesn't expire. The app can work in the background indefinitely",
        alternatives: "Only grant if the app needs to perform automated tasks while you're away",
        realWorld: "Like leaving your house key with someone permanently"
      },
      'profile': {
        plainEnglish: "The app can see your personal profile information",
        whatItMeans: "Access to your name, email, profile photo, and other identity details",
        alternatives: "Usually safe for legitimate apps that need to personalize your experience",
        realWorld: "Like sharing your LinkedIn profile"
      },
      'email': {
        plainEnglish: "The app can see your email address",
        whatItMeans: "Access to your primary email address for communication",
        alternatives: "Common requirement for most apps to contact you",
        realWorld: "Like giving out your email for newsletters"
      }
    };
    
    const normalized = scopeName.toLowerCase().replace(/[^a-z_]/g, '_');
    
    // Try to find matching explanation
    for (const [key, explanation] of Object.entries(expertExplanations)) {
      if (normalized.includes(key.replace(/-/g, '_'))) {
        return explanation;
      }
    }
    
    // Generic explanation for unknown scopes
    return {
      plainEnglish: "This is a specialized OAuth scope",
      whatItMeans: "The app is requesting access to a specific Salesforce feature or API",
      alternatives: "Review the app's documentation to understand why this permission is needed",
      realWorld: "Similar to granting access to a specific feature in an app"
    };
  }
  
  // Get approval recommendation (teammate's system)
  function getApprovalRecommendation(riskLevel) {
    const recommendations = {
      'CRITICAL': {
        icon: '🚨',
        title: 'NOT RECOMMENDED',
        message: 'This app requests FULL ACCESS to your Salesforce org. Only approve if you completely trust this application.',
        bgColor: '#ffebee',
        textColor: '#c62828'
      },
      'HIGH': {
        icon: '⚠️',
        title: 'PROCEED WITH CAUTION',
        message: 'This app requests broad API access. Verify the application publisher and ensure you trust them with your data.',
        bgColor: '#fff3e0',
        textColor: '#e65100'
      },
      'MEDIUM': {
        icon: '⚡',
        title: 'REVIEW CAREFULLY',
        message: 'This app requests moderate permissions. Review the specific scopes below before approving.',
        bgColor: '#fff9c4',
        textColor: '#f57f17'
      },
      'LOW': {
        icon: '✓',
        title: 'LOW RISK',
        message: 'This app requests limited permissions. Generally safe to approve if you trust the source.',
        bgColor: '#f1f8e9',
        textColor: '#558b2f'
      },
      'MINIMAL': {
        icon: '✓',
        title: 'MINIMAL RISK',
        message: 'This app requests very limited permissions. Safe to approve.',
        bgColor: '#e8f5e9',
        textColor: '#2e7d32'
      },
      'NONE': {
        icon: 'ℹ️',
        title: 'NO SCOPES',
        message: 'No scopes detected yet.',
        bgColor: '#e3f2fd',
        textColor: '#1565c0'
      }
    };
    
    return recommendations[riskLevel] || recommendations['MEDIUM'];
  }

  // Check for OAuth errors in URL
  function checkForOAuthError() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const errorUri = urlParams.get('error_uri');
    
    // Also check hash fragment (for implicit flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    
    let finalError = error || hashError;
    let finalDescription = errorDescription || hashErrorDescription;
    let finalUri = errorUri;
    
    // If no error in URL/hash, check page content
    // For authorize endpoint: errors are displayed in page body when redirect fails
    // For token endpoint: errors are returned as JSON or XML
    const pathname = window.location.pathname.toLowerCase();
    if (!finalError && (pathname.includes('/services/oauth2/authorize') || pathname.includes('/services/oauth2/token'))) {
      console.log('OAuth Doctor: Checking page content for OAuth errors...');
      
      // Check if document.body exists (might be null for XML responses)
      if (!document.body) {
        console.log('OAuth Doctor: document.body is null, checking for XML content...');
        
        // For XML responses, try to extract raw text first to avoid parsing issues
        try {
          // Method 1: Try to get raw XML as text
          const xmlSerializer = new XMLSerializer();
          const xmlString = xmlSerializer.serializeToString(document);
          console.log('OAuth Doctor: Raw XML string length:', xmlString.length);
          
          // Use regex to extract error and error_description from raw XML
          // This avoids HTML parsing issues inside XML elements
          // Match everything including potential HTML tags, then strip them
          const errorMatch = xmlString.match(/<error>(.*?)<\/error>/i);
          const errorDescMatch = xmlString.match(/<error_description>(.*?)<\/error_description>/is);
          
          if (errorMatch) {
            finalError = errorMatch[1].trim();
            // Strip any HTML tags from error
            finalError = finalError.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log('OAuth Doctor: Extracted error from XML:', finalError);
          }
          
          if (errorDescMatch) {
            finalDescription = errorDescMatch[1].trim();
            // Aggressively remove <br>, </br>, and any other HTML tags
            finalDescription = finalDescription
              .replace(/<br\s*\/?>/gi, ' ')  // Remove <br>, <br/>, <br />
              .replace(/<\/br>/gi, ' ')      // Remove malformed </br>
              .replace(/<[^>]*>/g, ' ')       // Remove any other HTML tags
              .replace(/\s+/g, ' ')           // Collapse multiple spaces
              .trim();
            console.log('OAuth Doctor: Extracted error_description from XML (cleaned):', finalDescription);
          }
          
          // If regex didn't work, try DOM method with textContent (safer than innerHTML)
          if (!finalError) {
            const errorElement = document.querySelector('error');
            const errorDescElement = document.querySelector('error_description');
            
            if (errorElement) {
              // Use textContent to get raw text without HTML parsing
              finalError = errorElement.textContent || errorElement.textContent || '';
              finalError = finalError.trim();
              console.log('OAuth Doctor: Found error via querySelector:', finalError);
            }
            
            if (errorDescElement) {
              finalDescription = errorDescElement.textContent || errorDescElement.textContent || '';
              finalDescription = finalDescription.trim();
              // Aggressively remove <br>, </br>, and any other HTML tags
              finalDescription = finalDescription
                .replace(/<br\s*\/?>/gi, ' ')  // Remove <br>, <br/>, <br />
                .replace(/<\/br>/gi, ' ')      // Remove malformed </br>
                .replace(/<[^>]*>/g, ' ')       // Remove any other HTML tags
                .replace(/\s+/g, ' ')           // Collapse multiple spaces
                .trim();
              console.log('OAuth Doctor: Found error_description via querySelector (cleaned):', finalDescription);
            }
          } else {
            // Clean up the extracted text
            if (finalDescription) {
              // Aggressively remove <br>, </br>, and any other HTML tags
              finalDescription = finalDescription
                .replace(/<br\s*\/?>/gi, ' ')  // Remove <br>, <br/>, <br />
                .replace(/<\/br>/gi, ' ')      // Remove malformed </br>
                .replace(/<[^>]*>/g, ' ')       // Remove any other HTML tags
                .replace(/\s+/g, ' ')           // Collapse multiple spaces
                .trim();
            }
          }
        } catch (e) {
          console.error('OAuth Doctor: Error parsing XML:', e);
        }
        
        // If still no error found, return early since there's no body to check
        if (!finalError) {
          return null;
        }
      } else {
        const bodyText = document.body.innerText || document.body.textContent || '';
        
        // For token endpoint, try to parse as JSON first
        if (pathname.includes('/services/oauth2/token')) {
          try {
            console.log('OAuth Doctor: Attempting to parse token endpoint response as JSON...');
            const jsonData = JSON.parse(bodyText);
            
            if (jsonData.error) {
              finalError = jsonData.error;
              finalDescription = jsonData.error_description || jsonData.message || '';
              finalUri = jsonData.error_uri || '';
              console.log('OAuth Doctor: Found error in JSON response:', finalError, finalDescription);
            }
          } catch (e) {
            console.log('OAuth Doctor: Token endpoint response is not JSON, checking other formats...');
          }
          
          // If JSON parsing failed, try XML parsing
          if (!finalError) {
            try {
              console.log('OAuth Doctor: Attempting to parse as XML...');
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(bodyText, 'text/xml');
              const errorElement = xmlDoc.querySelector('error');
              const errorDescElement = xmlDoc.querySelector('error_description');
              
              if (errorElement && !xmlDoc.querySelector('parsererror')) {
                finalError = errorElement.textContent;
                if (errorDescElement) {
                  finalDescription = errorDescElement.textContent;
                }
                console.log('OAuth Doctor: Found error in XML response:', finalError, finalDescription);
              }
            } catch (e) {
              console.log('OAuth Doctor: Failed to parse as XML:', e);
            }
          }
        }
      }
      
      // If still no error and we have body text, check HTML content (works for both endpoints)
      if (!finalError && document.body) {
        const bodyText = document.body.innerText || document.body.textContent || '';
        
        // Look for error patterns in the page content
        // Pattern 1: error=xxx&error_description=yyy
        const errorPattern1 = /error=([^&\s]+)(?:&|.*?)error_description=([^&\s]+)/i;
        const match1 = bodyText.match(errorPattern1);
        
        if (match1) {
          finalError = decodeURIComponent(match1[1]);
          finalDescription = decodeURIComponent(match1[2].replace(/\+/g, ' '));
          console.log('OAuth Doctor: Found error in page content (pattern 1):', finalError, finalDescription);
        } else {
          // Pattern 2: Look for common error keywords
          const errorPattern2 = /error[:\s]+([a-z_]+)/i;
          const match2 = bodyText.match(errorPattern2);
          
          if (match2) {
            finalError = match2[1];
            
            // Try to find description
            const descPattern = /error[_\s]description[:\s]+(.+?)(?:\n|$)/i;
            const descMatch = bodyText.match(descPattern);
            if (descMatch) {
              finalDescription = descMatch[1].trim();
            }
            console.log('OAuth Doctor: Found error in page content (pattern 2):', finalError, finalDescription);
          }
        }
        
        // Pattern 3: Look for specific Salesforce error messages
        if (!finalError) {
          if (bodyText.includes('redirect_uri') && (bodyText.includes('mismatch') || bodyText.includes('must match'))) {
            finalError = 'redirect_uri_mismatch';
            finalDescription = 'The redirect_uri in the request does not match the configured callback URL';
            console.log('OAuth Doctor: Detected redirect_uri_mismatch from page content');
          } else if (bodyText.includes('invalid_client_id') || (bodyText.includes('client_id') && bodyText.includes('invalid'))) {
            finalError = 'invalid_client_id';
            finalDescription = 'The client_id is invalid or not found';
            console.log('OAuth Doctor: Detected invalid_client_id from page content');
          } else if (bodyText.includes('unauthorized_client') || bodyText.includes('not authorized')) {
            finalError = 'unauthorized_client';
            finalDescription = 'The client is not authorized to use this authorization flow';
            console.log('OAuth Doctor: Detected unauthorized_client from page content');
          } else if (bodyText.includes('invalid_grant') || bodyText.includes('authentication failure')) {
            finalError = 'invalid_grant';
            finalDescription = 'Authentication failed or authorization code is invalid';
            console.log('OAuth Doctor: Detected invalid_grant from page content');
          } else if (bodyText.includes('invalid_client') || bodyText.includes('client authentication failed')) {
            finalError = 'invalid_client';
            finalDescription = 'Client authentication failed';
            console.log('OAuth Doctor: Detected invalid_client from page content');
          }
        }
      }
    }
    
    if (finalError) {
      // Final safety check: clean error and description one more time
      // This catches any edge cases where HTML might have slipped through
      if (finalError) {
        finalError = finalError
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/br>/gi, ' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      if (finalDescription) {
        finalDescription = finalDescription
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/br>/gi, ' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      return {
        error: finalError,
        description: finalDescription,
        uri: finalUri,
        explanation: ERROR_EXPLANATIONS[finalError] || {
          title: 'OAuth Error',
          description: finalDescription || 'An unknown OAuth error occurred.',
          fix: ['Check your OAuth configuration', 'Review Salesforce documentation'],
          severity: 'error'
        }
      };
    }
    
    return null;
  }

  // Flag to prevent multiple overlays from being created
  let isCreatingOverlay = false;

  // HTML escape function to prevent XSS and parsing errors
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Aggressively strip ALL HTML tags including malformed ones
  function stripAllHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/<br\s*\/?>/gi, ' ')      // Remove <br>, <br/>, <br />
      .replace(/<\/br>/gi, ' ')          // Remove malformed </br>
      .replace(/<[^>]*>/g, ' ')          // Remove any other HTML tags
      .replace(/&nbsp;/gi, ' ')          // Remove HTML entities
      .replace(/&[a-z0-9#]+;/gi, ' ')    // Remove other HTML entities
      .replace(/\s+/g, ' ')               // Collapse multiple spaces
      .trim();
  }

  // Create the analyzer overlay
  async function createAnalyzerOverlay(scopes, analysis, error) {
    // Prevent multiple overlays from being created simultaneously
    if (isCreatingOverlay) {
      console.log('OAuth Doctor: Already creating overlay, skipping...');
      return;
    }
    
    isCreatingOverlay = true;
    
    try {
      // Remove existing overlay if present (without animation to avoid flicker)
      const existing = document.getElementById('oauth-doctor-overlay');
      if (existing) {
        existing.remove();
      }
      
      // Determine overall risk and color scheme
      let overallRisk, recommendation, borderColor;
      
      if (error) {
        // Error mode - use red/orange theme
        overallRisk = { level: 'ERROR', score: 'N/A', color: '#dc3545' };
        recommendation = {
          icon: '⚠️',
          title: 'OAuth Error Detected',
          message: 'An OAuth authorization error occurred. Review the diagnosis below.',
          bgColor: '#fff5f5',
          textColor: '#c62828'
        };
        borderColor = '#dc3545';
      } else if (scopes && scopes.length > 0) {
        // Scope analysis mode
        overallRisk = calculateOverallRisk(analysis);
        recommendation = getApprovalRecommendation(overallRisk.level);
        borderColor = overallRisk.color;
      } else {
        // No data mode
        overallRisk = { level: 'NONE', score: 0, color: '#9e9e9e' };
        recommendation = {
          icon: 'ℹ️',
          title: 'No OAuth Data',
          message: 'No scopes or errors detected on this page.',
          bgColor: '#f5f5f5',
          textColor: '#666'
        };
        borderColor = '#9e9e9e';
      }
      
      const overlay = document.createElement('div');
      overlay.id = 'oauth-doctor-overlay';
      overlay.className = 'oauth-doctor-overlay';
      
      // Ensure overlay has fixed positioning (works in both HTML and XML)
      // Use setAttribute for XML compatibility
      const overlayStyles = 'position: fixed; top: 20px; right: 20px; z-index: 2147483647; pointer-events: auto;';
      overlay.setAttribute('style', overlayStyles);
      
      let contentHTML = '';
      
      // Build error diagnosis section
      if (error) {
        const { explanation } = error;
        
        // Strip ALL HTML from error description before using it
        const cleanErrorDescription = error.description ? stripAllHtml(error.description) : '';
        const cleanExplanationDescription = explanation.description ? stripAllHtml(explanation.description) : '';
        const cleanExplanationTitle = explanation.title ? stripAllHtml(explanation.title) : '';
        
        contentHTML += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 15px 0; font-size: 16px; color: #333; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">⚠️</span>
            <span>${escapeHtml(cleanExplanationTitle)}</span>
          </h4>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.6;">
            ${escapeHtml(cleanExplanationDescription)}
          </p>
          ${cleanErrorDescription ? `
            <div style="padding: 12px; background: #f5f5f5; border-radius: 8px; margin: 12px 0;">
              <strong style="font-size: 13px; color: #555;">Details:</strong>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${escapeHtml(cleanErrorDescription)}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; border: 2px solid #e0e0e0;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #333;">💡 How to Fix:</h4>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #555; line-height: 1.8;">
              ${explanation.fix.map(step => `<li style="margin-bottom: 8px;">${escapeHtml(stripAllHtml(step))}</li>`).join('')}
            </ol>
          </div>
          
          <div class="oauth-doctor-ai-section" id="ai-analysis-section" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: #f8f9fa; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
              <input type="checkbox" id="enable-error-ai-analysis" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
              <div style="flex: 1;">
                <strong style="font-size: 14px; color: #333;">🤖 Use AI-Enhanced Troubleshooting</strong>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Get personalized troubleshooting advice from AI based on Salesforce documentation</p>
              </div>
            </label>
            <div id="error-ai-results" style="display: none; margin-top: 15px;"></div>
          </div>
        </div>
        `;
        
        // Set up AI analysis checkbox after rendering
        setTimeout(() => {
          setupErrorAICheckbox(error, explanation);
        }, 100);
      }
      
      // Build scope analysis section (teammate's design with AI explains)
      if (scopes && scopes.length > 0) {
        // Use rule-based analysis by default (AI will be on-demand via checkbox)
        console.log('Using rule-based security analysis (AI on-demand)...');
        console.log('OAuth Doctor: Analysis data passed to detectAnomalies:', analysis);
        let anomalies = detectAnomalies(analysis);
        // Ensure anomalies is always an array
        if (!Array.isArray(anomalies)) {
          console.error('OAuth Doctor: detectAnomalies did not return an array!', anomalies);
          anomalies = [];
        }
        console.log('OAuth Doctor: Security Analysis - Detected', anomalies.length, 'anomalies');
        console.log('OAuth Doctor: Anomalies:', anomalies);
        let explanationsMap = new Map(); // Store AI explanations by scope name
        
        // Check if AI is available (but don't call it automatically)
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        const config = await browserAPI.storage.local.get(['sfLlmApiKey', 'aiModel']);
        const hasApiKey = !!config.sfLlmApiKey;
        const aiAvailable = hasApiKey;
        const aiModel = config.aiModel || 'claude-sonnet-4-20250514';
        
        // Debug: Log anomalies right before generating HTML
        console.log('OAuth Doctor: About to generate Security Analysis HTML with anomalies:', JSON.stringify(anomalies, null, 2));
        
        // AI Analysis Toggle Section (moved above)
        contentHTML += `
        ${aiAvailable ? `
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 14px; background: #f8f9fa; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;" onmouseover="this.style.background='#e9ecef'; this.style.borderColor='#7c3aed'" onmouseout="this.style.background='#f8f9fa'; this.style.borderColor='#e0e0e0'">
            <input type="checkbox" id="enable-scope-ai-analysis" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
            <div style="flex: 1;">
              <strong style="font-size: 14px; color: #333;">🤖 Use AI-Powered Analysis</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Replace rule-based analysis with AI insights from ${getModelDisplayName(aiModel)}</p>
            </div>
          </label>
        </div>
        ` : `
        <div style="
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          border: 2px solid #ffc107;
          border-radius: 10px;
          padding: 18px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
        ">
          <div style="display: flex; align-items: start; gap: 14px;">
            <div style="font-size: 36px; line-height: 1;">⚠️</div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 17px; font-weight: 700;">
                AI Analysis Not Available
              </h4>
              <p style="margin: 0 0 14px 0; color: #856404; font-size: 14px; line-height: 1.6;">
                Configure your API key to enable <strong>AI-powered security insights</strong>:
              </p>
              <ol style="margin: 0; padding-left: 22px; color: #856404; font-size: 13px; line-height: 1.8;">
                <li>Click the <strong>OAuth Doctor icon</strong> in your browser toolbar</li>
                <li>Select your preferred AI model</li>
                <li>Paste your <strong>LLM_GW_EXPRESS_KEY</strong> API key</li>
                <li>Click <strong>"Save API Key"</strong></li>
                <li>Refresh this page to enable AI analysis</li>
              </ol>
            </div>
          </div>
        </div>
        `}
        
        <!-- Security Analysis Section -->
        <div id="security-analysis-container" style="
          margin-bottom: 24px;
          background: white;
          border-radius: 10px;
          border: 2px solid #7c3aed;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
          display: block !important;
          visibility: visible !important;
        " data-anomaly-count="${anomalies ? anomalies.length : 0}">
          <div style="
            background: #7c3aed;
            color: white;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div id="security-analysis-title" style="display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px;">
              <span style="font-size: 20px;">⚙️</span>
              Security Analysis
            </div>
            <div style="
              background: rgba(255,255,255,0.25);
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            "><span id="anomaly-count">${anomalies ? anomalies.length : 0}</span> ${anomalies && anomalies.length === 1 ? 'alert' : 'alerts'}</div>
          </div>
          
          <div style="padding: 18px !important; min-height: 60px !important; display: block !important;">
            <!-- Rule-based Analysis Results (default) -->
            <div id="scope-rule-based-results" style="display: block !important; visibility: visible !important; min-height: 40px !important;">
              ${(anomalies && anomalies.length > 0) ? anomalies.map((anomaly, index) => {
                try {
                  return `
              <div style="padding: 16px 0; ${index < anomalies.length - 1 ? 'border-bottom: 1px solid #f3e8ff;' : ''}">
                <div style="display: flex; align-items: start; gap: 12px;">
                  <div style="font-size: 32px; line-height: 1; flex-shrink: 0; margin-top: 2px;">${anomaly.icon || '⚠️'}</div>
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="background: ${anomaly.color || '#666'}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${escapeHtml(anomaly.severity || 'UNKNOWN')}</span>
                      <span style="font-size: 14px; font-weight: 600; color: #1f2937;">${escapeHtml(anomaly.title || 'Anomaly Detected')}</span>
                    </div>
                    <p style="font-size: 13px; color: #4b5563; line-height: 1.6; margin: 0 0 12px 0;">${escapeHtml(anomaly.message || 'No message available')}</p>
                    <div style="padding: 10px 12px; background: #faf5ff; border-left: 3px solid #7c3aed; border-radius: 4px;">
                      <div style="font-size: 12px; color: #374151; line-height: 1.5;">
                        <strong style="color: #7c3aed;">💡 Recommendation:</strong> ${escapeHtml(anomaly.recommendation || 'Review this permission carefully')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>`;
                } catch (e) {
                  console.error('OAuth Doctor: Error rendering anomaly:', e, anomaly);
                  return '<div style="padding: 16px; background: #fff3cd; border-radius: 4px;">Error rendering anomaly</div>';
                }
              }).join('') : `
              <div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
                <p style="margin: 0; font-size: 14px; color: #666; font-weight: 600;">No Security Concerns Detected</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #888;">
                  Rule-based analysis found no suspicious patterns in the requested scopes. Review individual scope details below for more information.
                </p>
              </div>
              `}
            </div>
            
            <!-- AI Analysis Results (hidden by default) -->
            <div id="scope-ai-results" style="display: none;"></div>
          </div>
        </div>
        
        <div style="margin: 25px 0; height: 2px; background: linear-gradient(90deg, transparent, #ddd, transparent);"></div>
        `;
        
        console.log('OAuth Doctor: Security Analysis section added to contentHTML. Anomalies count:', anomalies.length);
        
        // Debug: Check if security-analysis-container is in contentHTML
        if (contentHTML.includes('security-analysis-container')) {
          console.log('OAuth Doctor: ✅ security-analysis-container is in contentHTML');
          // Extract and log the security analysis HTML
          const startIdx = contentHTML.indexOf('<div id="security-analysis-container"');
          const endIdx = contentHTML.indexOf('</div>', startIdx + 500) + 6; // Find closing div after at least 500 chars
          if (startIdx >= 0 && endIdx > startIdx) {
            const securityHTML = contentHTML.substring(startIdx, Math.min(endIdx + 200, contentHTML.length));
            console.log('OAuth Doctor: Security Analysis HTML (first 800 chars):', securityHTML.substring(0, 800));
          }
        } else {
          console.error('OAuth Doctor: ❌ security-analysis-container is NOT in contentHTML!');
        }
      
      // Generate scope details with AI explains buttons
      const scopesHTML = analysis.map(scope => {
        // Use AI explanation if available, otherwise fallback to expert explanation
        const aiExplanation = explanationsMap.get(scope.scope);
        const expertExplanation = aiExplanation || getExpertExplanation(scope.scope);
        const isAIGenerated = !!aiExplanation;
        
        return `
        <div style="padding: 12px; margin: 8px 0; border-left: 4px solid ${scope.color}; background: ${scope.color}15; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <strong style="color: ${scope.color}; font-size: 13px; text-transform: uppercase;">
              ${escapeHtml(scope.scope)}
            </strong>
            <span style="background: ${scope.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
              ${escapeHtml(scope.level)}
            </span>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #555;">
            ${escapeHtml(scope.description)}
          </p>
          <div style="margin-top: 5px; font-size: 11px; color: #666;">
            Risk Score: ${scope.score}/10
          </div>
          
          <details style="margin-top: 10px;">
            <summary style="
              cursor: pointer;
              font-size: 12px;
              color: #7c3aed;
              font-weight: 600;
              padding: 8px 14px;
              background: white;
              border: 2px solid #7c3aed;
              border-radius: 6px;
              user-select: none;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              transition: all 0.2s;
            " 
            onmouseover="this.style.background='#faf5ff'"
            onmouseout="this.style.background='white'">
              <span style="font-size: 14px;">${isAIGenerated ? '🤖' : '👨‍💼'}</span>
              <span>${isAIGenerated ? 'AI explains' : 'Security expert explains'}</span>
              ${isAIGenerated ? '<span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; margin-left: 4px;">REAL AI</span>' : ''}
            </summary>
            
            <div style="margin-top: 14px; padding: 16px; background: #faf5ff; border: 2px solid #e9d5ff; border-radius: 8px; font-size: 12px; line-height: 1.7;">
              <div style="margin-bottom: 14px;">
                <div style="font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 6px;">💬 In plain English:</div>
                <div style="color: #374151;">${escapeHtml(expertExplanation.plainEnglish)}</div>
              </div>
              
              <div style="margin-bottom: 14px;">
                <div style="font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 6px;">📋 What this allows:</div>
                <div style="color: #374151;">${escapeHtml(expertExplanation.whatItMeans)}</div>
              </div>
              
              <div style="margin-bottom: 14px;">
                <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 6px;">💡 Things to consider:</div>
                <div style="color: #374151;">${escapeHtml(expertExplanation.alternatives)}</div>
              </div>
              
              <div style="padding: 10px 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">
                <div style="font-size: 13px; font-weight: 600; color: #10b981; margin-bottom: 4px;">🌍 Real-world comparison:</div>
                <div style="color: #374151; font-style: italic;">"${escapeHtml(expertExplanation.realWorld)}"</div>
              </div>
            </div>
          </details>
        </div>
        `;
      }).join('');
      
      contentHTML += `
        <div style="margin-bottom: 18px; padding: 12px; background: #f8f9fa; border-left: 4px solid #666; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📋</span>
            OAuth Scope Details (${analysis.length})
          </h4>
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5;">
            Technical details for each permission. Click the <strong style="color: #7c3aed;">👨‍💼 Security expert explains</strong> button to get plain-language explanations.
          </p>
        </div>
        
        ${scopesHTML}
        
        <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; font-size: 11px;">
          <strong style="display: block; margin-bottom: 8px; color: #333;">Risk Levels:</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            <div><span style="color: #d32f2f;">●</span> CRITICAL (9-10)</div>
            <div><span style="color: #f57c00;">●</span> HIGH (7-8)</div>
            <div><span style="color: #ff9800;">●</span> MEDIUM-HIGH (6)</div>
            <div><span style="color: #fbc02d;">●</span> MEDIUM (4-5)</div>
            <div><span style="color: #afb42b;">●</span> MEDIUM-LOW (3-4)</div>
            <div><span style="color: #7cb342;">●</span> LOW (1-3)</div>
          </div>
        </div>
        `;
      }
      
      // Final safety check: Scan contentHTML for any remaining malformed HTML tags
      // This is a last resort to catch anything that slipped through
      let sanitizedContentHTML = contentHTML || '<p style="text-align: center; color: #999; padding: 40px 20px;">No OAuth data detected.</p>';
      
      // Remove any malformed <br> tags that might have slipped through
      sanitizedContentHTML = sanitizedContentHTML
        .replace(/<\/br>/gi, '')  // Remove malformed </br> tags completely
        .replace(/<br\s*[^>]*>/gi, '<br />');  // Normalize all <br> tags to self-closing
      
      // Build complete popup HTML string
      const overlayHTMLString = `
      <div class="oauth-doctor-popup-container" style="
        background: white;
        border: 4px solid ${borderColor};
        border-radius: 16px;
        width: 480px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1), 0 0 40px ${borderColor}60;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
      ">
        <!-- Pulsing border effect -->
        <div style="
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 4px solid ${borderColor};
          border-radius: 16px;
          animation: pulse-border 2s ease-in-out infinite;
          pointer-events: none;
          opacity: 0.5;
        "></div>
        
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%);
          padding: 16px 20px;
          color: white;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px);
            animation: slide-bg 20s linear infinite;
            pointer-events: none;
          "></div>
          
          <div style="display: flex; justify-content: space-between; align-items: start; position: relative;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); line-height: 1.2;">
                🩺 OAuth Doctor<br>Security Diagnosis
              </h3>
              <div style="font-size: 13px; opacity: 0.95; font-weight: 600;">
                Overall Risk: <strong style="font-size: 15px; text-decoration: underline;">${overallRisk.level}</strong> ${overallRisk.score !== 'N/A' ? `(${overallRisk.score}/10)` : ''}
              </div>
            </div>
            <button id="oauth-doctor-close" style="
              background: rgba(255,255,255,0.2);
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: white;
              padding: 0;
              line-height: 1;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              transition: all 0.2s;
              flex-shrink: 0;
            " 
            onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
            onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
          </div>
        </div>
        
        <!-- Content Area -->
        <div style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; min-height: 0;">
          <!-- Approval Recommendation Box -->
          <div style="
            padding: 18px;
            background: ${recommendation.bgColor};
            border: 3px solid ${recommendation.textColor};
            border-radius: 12px;
            margin-bottom: 20px;
            position: relative;
            box-shadow: 0 4px 12px ${recommendation.textColor}30;
          ">
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: ${recommendation.textColor};
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              animation: bounce-badge 1s ease-in-out infinite;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">!</div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 28px; animation: wiggle-icon 1.5s ease-in-out infinite;">${recommendation.icon}</span>
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: bold; color: ${recommendation.textColor}; margin-bottom: 4px;">
                  ${recommendation.title}
                </div>
                <div style="font-size: 13px; color: ${recommendation.textColor}; line-height: 1.5;">
                  ${recommendation.message}
                </div>
              </div>
            </div>
            
            ${overallRisk.score !== 'N/A' ? `
            <div style="margin-top: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: bold; color: ${recommendation.textColor};">RISK SCORE</span>
                <span style="font-size: 16px; font-weight: bold; color: ${recommendation.textColor};">${overallRisk.score}/10</span>
              </div>
              <div style="width: 100%; height: 12px; background: white; border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                <div style="width: ${overallRisk.score * 10}%; height: 100%; background: linear-gradient(90deg, ${overallRisk.color}, ${overallRisk.color}dd); border-radius: 6px; transition: width 0.5s ease;"></div>
              </div>
            </div>
            ` : ''}
          </div>
          
          ${sanitizedContentHTML}
        </div>
      </div>
    `;
    
      // Use DOMParser to safely parse HTML for XML documents
      // This avoids Firefox's XML parsing errors when using innerHTML
      const contentType = document.contentType || '';
      const isXMLDocument = contentType.includes('xml') || 
                           contentType.includes('application/xml') ||
                           contentType.includes('text/xml') ||
                           !document.body ||
                           (document.documentElement && document.documentElement.nodeName === 'OAuth');
      
      if (isXMLDocument) {
        console.log('OAuth Doctor: Detected XML document, using DOMParser for safe HTML parsing');
        try {
          // Parse HTML in a safe HTML document context
          const parser = new DOMParser();
          const htmlDoc = parser.parseFromString(overlayHTMLString, 'text/html');
          
          // Check for parsing errors
          const parseError = htmlDoc.querySelector('parsererror');
          if (parseError) {
            console.error('OAuth Doctor: HTML parsing error:', parseError.textContent);
            throw new Error('HTML parsing failed');
          }
          
          // Get the parsed container element
          const parsedContainer = htmlDoc.body.firstElementChild || htmlDoc.body.querySelector('.oauth-doctor-popup-container');
          if (parsedContainer) {
            // Clear overlay using DOM methods (safe for XML)
            while (overlay.firstChild) {
              overlay.removeChild(overlay.firstChild);
            }
            
            // Import the entire container into the current document
            // IMPORTANT: Append the container AS A CHILD of overlay, don't replace overlay
            // This works for both HTML and XML documents
            const importedContainer = document.importNode(parsedContainer, true);
            
            // Append the container to overlay (overlay keeps its fixed positioning CSS)
            overlay.appendChild(importedContainer);
          } else {
            throw new Error('Could not find parsed container');
          }
        } catch (e) {
          console.error('OAuth Doctor: Error parsing HTML with DOMParser:', e);
          // Fallback: Use innerHTML but wrap in try-catch
          try {
            overlay.innerHTML = overlayHTMLString;
          } catch (e2) {
            console.error('OAuth Doctor: innerHTML also failed:', e2);
            // Last resort: create minimal error display
            overlay.innerHTML = `
              <div style="padding: 20px; background: white; border: 2px solid #dc3545; border-radius: 8px;">
                <h3 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ OAuth Error</h3>
                <p style="margin: 0; color: #666;">${escapeHtml(error ? (error.error || 'Unknown error') : 'Error parsing page')}</p>
              </div>
            `;
          }
        }
      } else {
        // For regular HTML documents, innerHTML is safe
        overlay.innerHTML = overlayHTMLString;
      }
    
      // Check if this is a pure XML document (no body, XML content-type)
      const docContentType = document.contentType || '';
      const isPureXML = !document.body && 
                       (docContentType.includes('xml') || docContentType.includes('application/xml') || docContentType.includes('text/xml'));
      
      if (isPureXML) {
        // For pure XML documents, we use an iframe with srcdoc to display the popup
        // This preserves the XML display while showing our overlay
        console.log('OAuth Doctor: Detected pure XML document, using iframe with srcdoc to preserve XML display');
        console.log('OAuth Doctor: Original XML document preserved:', document.documentElement.outerHTML);
        
        // Create an iframe to host our HTML popup (positioned on right side only)
        // Match the exact dimensions of the authorize endpoint popup
        const iframe = document.createElementNS('http://www.w3.org/1999/xhtml', 'iframe');
        iframe.id = 'oauth-doctor-overlay-frame';
        iframe.setAttribute('style', `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 480px;
          max-width: calc(100vw - 40px);
          height: 80vh;
          max-height: calc(100vh - 40px);
          border: none;
          border-radius: 16px;
          overflow: hidden;
          z-index: 2147483647;
          background: transparent;
          pointer-events: auto;
        `);
        
        // Extract styles from the overlay HTML
        const styleMatch = overlayHTMLString.match(/<style>([\s\S]*?)<\/style>/);
        const inlineStyles = styleMatch ? styleMatch[1] : '';
        
        // Use srcdoc instead of document.write (safer and works in content scripts)
        const iframeContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html { 
                margin: 0; 
                padding: 0; 
                background: transparent; 
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              body { 
                margin: 0; 
                padding: 0; 
                background: transparent; 
                width: 100%;
                height: 100%;
                min-height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
              }
              /* Make popup container fill entire iframe */
              .oauth-doctor-popup-container {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 16px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
              }
              /* Prevent header from growing */
              .oauth-doctor-popup-container > div[style*="background: linear-gradient"] {
                flex-shrink: 0 !important;
                flex-grow: 0 !important;
              }
              /* Ensure content area fills remaining space */
              .oauth-doctor-popup-container > div[style*="overflow-y: auto"],
              .oauth-doctor-popup-container > div:nth-child(2) {
                flex: 1 !important;
                min-height: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                overflow-y: auto !important;
              }
              /* Ensure Security Analysis section is visible */
              #security-analysis-container {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                margin-bottom: 24px !important;
              }
              #security-analysis-container > div {
                display: block !important;
                visibility: visible !important;
                height: auto !important;
                overflow: visible !important;
              }
              #security-analysis-container > div[style*="padding"] {
                padding: 18px !important;
                min-height: 60px !important;
              }
              #scope-rule-based-results {
                display: block !important;
                visibility: visible !important;
                min-height: 50px !important;
                height: auto !important;
                overflow: visible !important;
              }
              #scope-rule-based-results > div {
                display: block !important;
                visibility: visible !important;
                height: auto !important;
              }
              #scope-ai-results {
                min-height: 0 !important;
              }
              ${inlineStyles}
            </style>
          </head>
          <body>
            ${overlayHTMLString}
          </body>
          </html>
        `;
        
        iframe.setAttribute('srcdoc', iframeContent);
        
        // Append iframe to documentElement
        // Note: This may affect Firefox's XML tree viewer, but the raw XML remains in the DOM
        document.documentElement.appendChild(iframe);
        
        // Log helpful message
        console.log('📋 OAuth Doctor: Original XML response:');
        console.log(document.documentElement.querySelector('error')?.textContent || 'N/A');
        console.log(document.documentElement.querySelector('error_description')?.textContent || 'N/A');
        console.log('\n💡 Tip: The XML content is preserved in the DOM. The popup is shown on the right side.');
        
        // Add close button handler and setup AI checkbox in iframe once loaded
        iframe.addEventListener('load', () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeWindow = iframe.contentWindow;
            
            // Setup close button
            const closeBtn = iframeDoc.getElementById('oauth-doctor-close');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                iframe.remove();
              });
            }
            
            // Setup AI checkbox for error analysis (if error exists)
            if (error) {
              const setupErrorAICheckboxInIframe = async (err, expl) => {
                const checkbox = iframeDoc.getElementById('enable-error-ai-analysis');
                const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
                
                if (!checkbox) return;
                
                let isLoading = false;
                
                checkbox.addEventListener('change', async (e) => {
                  if (isLoading) return;
                  
                  const resultsContainer = iframeDoc.getElementById('error-ai-results');
                  if (!resultsContainer) return;
                  
                  if (e.target.checked) {
                    // Show loading state
                    isLoading = true;
                    resultsContainer.style.display = 'block';
                    resultsContainer.innerHTML = `
                      <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
                        <div style="font-size: 14px; font-weight: 600; color: #7c3aed; margin-bottom: 8px;">AI Analysis in Progress...</div>
                        <div style="font-size: 12px; color: #666;">Analyzing OAuth error with AI...</div>
                      </div>
                    `;
                    
                    try {
                      // Get the stored model
                      const result = await browserAPI.storage.local.get(['aiModel']);
                      const selectedModel = result.aiModel || 'claude-sonnet-4-20250514';
                      
                      // Request AI analysis from background script (use chrome for iframe compatibility)
                      chrome.runtime.sendMessage({
                        action: 'getAIAnalysis',
                        errorCode: err.error,
                        errorDescription: err.description,
                        existingExplanation: expl,
                        model: selectedModel
                      }, (response) => {
                        if (chrome.runtime.lastError) {
                          console.error('OAuth Doctor: AI request failed', chrome.runtime.lastError);
                          resultsContainer.innerHTML = `
                            <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
                              <p style="margin: 0; color: #c62828; font-size: 13px;">
                                ❌ ${chrome.runtime.lastError.message}
                              </p>
                            </div>
                          `;
                          isLoading = false;
                          return;
                        }
                        
                        if (!response) {
                          resultsContainer.innerHTML = `
                            <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
                              <p style="margin: 0; color: #c62828; font-size: 13px;">
                                ❌ No response from background script
                              </p>
                            </div>
                          `;
                          isLoading = false;
                          return;
                        }
                        
                        if (response.success) {
                          // Format the AI response
                          const formattedAnalysis = response.analysis
                            .replace(/\n\n/g, '</p><p>')
                            .replace(/\n/g, '<br>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                          
                          // Get model display name (inline function since it's not available in iframe)
                          const modelNames = {
                            'claude-sonnet-4-20250514': 'Claude Sonnet 4',
                            'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
                            'claude-3-5-sonnet-20241022': 'Claude Sonnet 3.5',
                            'gemini-2.5-pro': 'Gemini 2.5 Pro',
                            'gemini-2.5-flash': 'Gemini 2.5 Flash',
                            'gemini-2.0-flash': 'Gemini 2.0 Flash',
                            'gpt-4o': 'GPT-4o',
                            'gpt-4o-mini': 'GPT-4o Mini'
                          };
                          const modelDisplayName = response.model ? (modelNames[response.model] || response.model) : 'AI';
                          const timestamp = response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
                          
                          resultsContainer.innerHTML = `
                            <div style="background: #faf5ff; border: 2px solid #e9d5ff; border-radius: 8px; padding: 16px;">
                              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <span style="font-size: 20px;">🤖</span>
                                <strong style="font-size: 14px; color: #7c3aed;">AI-Enhanced Troubleshooting</strong>
                                <span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700;">REAL AI</span>
                              </div>
                              <div style="font-size: 13px; color: #374151; line-height: 1.6;">
                                <p>${formattedAnalysis}</p>
                              </div>
                              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9d5ff; font-size: 11px; color: #888;">
                                ✨ Powered by ${modelDisplayName} • ${timestamp}
                              </div>
                            </div>
                          `;
                        } else {
                          resultsContainer.innerHTML = `
                            <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px;">
                              <p style="margin: 0; color: #c62828; font-size: 13px;">
                                ❌ ${response.error || 'AI analysis failed. Please check your API key.'}
                              </p>
                            </div>
                          `;
                        }
                        
                        isLoading = false;
                      });
                    } catch (err) {
                      console.error('AI analysis error:', err);
                      resultsContainer.innerHTML = `
                        <div style="padding: 16px; background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px;">
                          <div style="font-size: 13px; color: #721c24;">
                            ❌ Error during AI analysis: ${err.message}
                          </div>
                        </div>
                      `;
                      isLoading = false;
                    }
                  } else {
                    // Hide AI results
                    resultsContainer.style.display = 'none';
                    resultsContainer.innerHTML = '';
                  }
                });
              };
              
              // Call the setup function
              setupErrorAICheckboxInIframe(error, error.explanation);
            }
          } catch (e) {
            console.error('OAuth Doctor: Error setting up iframe:', e);
            // Fallback: remove iframe on any click
            iframe.addEventListener('click', () => iframe.remove());
          }
        });
        
        // Reset flag
        isCreatingOverlay = false;
        return; // Done for XML documents
      }
      
      // For HTML documents, append overlay as usual
      try {
        if (document.body) {
          // Normal HTML document - append to body
          document.body.appendChild(overlay);
        } else {
          // Edge case: No body but also not XML - try documentElement
          console.log('OAuth Doctor: No document.body, appending overlay to documentElement');
          document.documentElement.appendChild(overlay);
        }
      } catch (e) {
        console.error('OAuth Doctor: Error appending overlay:', e);
        throw new Error('Unable to append overlay to document');
      }
      
      // Reset flag to allow future overlays
      isCreatingOverlay = false;
      
      // Add close button handler with smooth animation
      document.getElementById('oauth-doctor-close').addEventListener('click', () => {
        closeOverlay(overlay);
      });
      
      // Verify Security Analysis section exists
      const securityAnalysisContainer = document.getElementById('security-analysis-container');
      if (securityAnalysisContainer) {
        console.log('OAuth Doctor: Security Analysis container found in DOM');
        console.log('OAuth Doctor: Container innerHTML length:', securityAnalysisContainer.innerHTML.length);
        console.log('OAuth Doctor: Container first 500 chars:', securityAnalysisContainer.innerHTML.substring(0, 500));
        console.log('OAuth Doctor: Container dimensions:', securityAnalysisContainer.offsetWidth + 'x' + securityAnalysisContainer.offsetHeight);
        
        // Force visibility and dimensions
        securityAnalysisContainer.style.display = 'block';
        securityAnalysisContainer.style.visibility = 'visible';
        securityAnalysisContainer.style.height = 'auto';
        securityAnalysisContainer.style.overflow = 'visible';
        
        // Force padding div visibility
        const paddingDiv = securityAnalysisContainer.querySelector('div[style*="padding"]');
        if (paddingDiv) {
          console.log('OAuth Doctor: Padding div found');
          console.log('OAuth Doctor: Padding div dimensions:', paddingDiv.offsetWidth + 'x' + paddingDiv.offsetHeight);
          paddingDiv.style.display = 'block';
          paddingDiv.style.padding = '18px';
          paddingDiv.style.minHeight = '60px';
          paddingDiv.style.height = 'auto';
          paddingDiv.style.overflow = 'visible';
        } else {
          console.error('OAuth Doctor: Padding div NOT found!');
        }
        
        // Check inner divs
        const ruleBasedResults = document.getElementById('scope-rule-based-results');
        if (ruleBasedResults) {
          console.log('OAuth Doctor: scope-rule-based-results found');
          console.log('OAuth Doctor: scope-rule-based-results innerHTML length:', ruleBasedResults.innerHTML.length);
          console.log('OAuth Doctor: scope-rule-based-results first 300 chars:', ruleBasedResults.innerHTML.substring(0, 300));
          console.log('OAuth Doctor: scope-rule-based-results dimensions:', ruleBasedResults.offsetWidth + 'x' + ruleBasedResults.offsetHeight);
          
          // Force visibility and dimensions
          ruleBasedResults.style.display = 'block';
          ruleBasedResults.style.visibility = 'visible';
          ruleBasedResults.style.minHeight = '50px';
          ruleBasedResults.style.height = 'auto';
          ruleBasedResults.style.overflow = 'visible';
          
          // Force all child divs to be visible
          const childDivs = ruleBasedResults.querySelectorAll('div');
          console.log('OAuth Doctor: Found', childDivs.length, 'child divs in scope-rule-based-results');
          childDivs.forEach((div, idx) => {
            div.style.display = 'block';
            div.style.visibility = 'visible';
            div.style.height = 'auto';
            console.log('OAuth Doctor: Child div', idx, 'dimensions:', div.offsetWidth + 'x' + div.offsetHeight);
          });
        } else {
          console.error('OAuth Doctor: scope-rule-based-results NOT found!');
        }
      } else {
        console.warn('OAuth Doctor: Security Analysis container NOT found in DOM!');
      }
      
      // Set up scope AI analysis checkbox if available
      const scopeAICheckbox = document.getElementById('enable-scope-ai-analysis');
      if (scopeAICheckbox && scopes && scopes.length > 0) {
        setupScopeAICheckbox(scopeAICheckbox, scopes);
      }
      
      // Optional: Close on Escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          closeOverlay(overlay);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    } catch (error) {
      console.error('OAuth Doctor: Error creating overlay:', error);
      // Clean up on error
      removeLoadingPopup();
      isCreatingOverlay = false;
    }
  }
  
  // Smooth close animation
  function closeOverlay(overlay) {
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.remove();
    }, 300); // Match animation duration
  }
  
  // Loading popup functions (teammate's implementation)
  function showLoadingPopup() {
    const existingPopup = document.getElementById('oauth-doctor-loading');
    if (existingPopup) return;
    
    const loadingHTML = `
      <div id="oauth-doctor-loading" style="
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      ">
        <div style="text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">AI Analysis in Progress</div>
          <div id="loading-status" style="font-size: 13px; opacity: 0.9;">Analyzing OAuth scopes with AI...</div>
          <div style="margin-top: 12px; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: white; animation: loading-bar 2s ease-in-out infinite; width: 40%;"></div>
          </div>
        </div>
        <style>
          @keyframes pulse-loading {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        </style>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
  }

  function updateLoadingPopup(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function removeLoadingPopup() {
    const loadingPopup = document.getElementById('oauth-doctor-loading');
    if (loadingPopup) {
      loadingPopup.style.transition = 'opacity 0.3s, transform 0.3s';
      loadingPopup.style.opacity = '0';
      loadingPopup.style.transform = 'translateY(-20px)';
      setTimeout(() => loadingPopup.remove(), 300);
    }
  }
  
  // Setup scope AI analysis checkbox
  async function setupScopeAICheckbox(checkbox, scopes) {
    let isLoading = false;
    let aiExplanationsMap = new Map(); // Store AI explanations globally
    
    checkbox.addEventListener('change', async (e) => {
      if (isLoading) return;
      
      const ruleBasedResults = document.getElementById('scope-rule-based-results');
      const aiResults = document.getElementById('scope-ai-results');
      const titleElement = document.getElementById('security-analysis-title');
      const countElement = document.getElementById('anomaly-count');
      
      if (!ruleBasedResults || !aiResults || !titleElement) return;
      
      if (e.target.checked) {
        // Switch to AI analysis
        isLoading = true;
        
        // Hide rule-based results
        ruleBasedResults.style.display = 'none';
        
        // Show loading state
        aiResults.style.display = 'block';
        aiResults.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
            <div style="font-size: 14px; font-weight: 600; color: #7c3aed; margin-bottom: 8px;">AI Analysis in Progress...</div>
            <div style="font-size: 12px; color: #666;">Analyzing OAuth scopes with AI...</div>
          </div>
        `;
        
        // Update title
        titleElement.innerHTML = `
          <span style="font-size: 20px;">🤖</span>
          AI Security Analysis
          <span style="background: rgba(255,255,255,0.95); color: #7c3aed; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; margin-left: 6px;">REAL AI</span>
        `;
        
        try {
          // Get AI anomaly detection
          const aiAnomalies = await getAIAnomalyDetection(scopes);
          
          // Don't pre-fetch AI explanations - they will be loaded on-demand when user clicks
          aiExplanationsMap.clear();
          
          if (aiAnomalies && aiAnomalies.length > 0) {
            // Update count
            if (countElement) {
              countElement.textContent = aiAnomalies.length;
            }
            
            // Display AI anomalies
            aiResults.innerHTML = `
              ${aiAnomalies.map((anomaly, index) => `
              <div style="padding: 16px 0; ${index < aiAnomalies.length - 1 ? 'border-bottom: 1px solid #f3e8ff;' : ''}">
                <div style="display: flex; align-items: start; gap: 12px;">
                  <div style="font-size: 32px; line-height: 1; flex-shrink: 0; margin-top: 2px;">${anomaly.icon}</div>
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="background: ${anomaly.color}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${escapeHtml(anomaly.severity)}</span>
                      <span style="font-size: 14px; font-weight: 600; color: #1f2937;">${escapeHtml(anomaly.title)}</span>
                    </div>
                    <p style="font-size: 13px; color: #4b5563; line-height: 1.6; margin: 0 0 12px 0;">${escapeHtml(anomaly.message)}</p>
                    <div style="padding: 10px 12px; background: #faf5ff; border-left: 3px solid #7c3aed; border-radius: 4px;">
                      <div style="font-size: 12px; color: #374151; line-height: 1.5;">
                        <strong style="color: #7c3aed;">💡 AI Recommendation:</strong> ${escapeHtml(anomaly.recommendation)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              `).join('')}
            `;
            
            // Update scope detail buttons to show AI explains (with lazy loading)
            updateScopeButtons(true, aiExplanationsMap, scopes);
          } else {
            aiResults.innerHTML = `
              <div style="background: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; color: #e65100; font-size: 13px;">
                  ⚠️ AI analysis unavailable. Switching back to rule-based analysis.
                </p>
              </div>
            `;
            // Switch back to rule-based
            setTimeout(() => {
              checkbox.checked = false;
              ruleBasedResults.style.display = 'block';
              aiResults.style.display = 'none';
              titleElement.innerHTML = `<span style="font-size: 20px;">⚙️</span> Security Analysis`;
            }, 2000);
          }
        } catch (error) {
          console.error('Error during AI analysis:', error);
          aiResults.innerHTML = `
            <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #c62828; font-size: 13px;">
                ❌ AI analysis failed. Switching back to rule-based analysis.
              </p>
            </div>
          `;
          // Switch back to rule-based
          setTimeout(() => {
            checkbox.checked = false;
            ruleBasedResults.style.display = 'block';
            aiResults.style.display = 'none';
            titleElement.innerHTML = `<span style="font-size: 20px;">⚙️</span> Security Analysis`;
          }, 2000);
        } finally {
          isLoading = false;
        }
      } else {
        // Switch back to rule-based analysis
        ruleBasedResults.style.display = 'block';
        aiResults.style.display = 'none';
        aiResults.innerHTML = '';
        
        // Update title
        titleElement.innerHTML = `
          <span style="font-size: 20px;">⚙️</span>
          Security Analysis
        `;
        
        // Update scope detail buttons to show expert explains
        updateScopeButtons(false, null, scopes);
        
        // Clear AI explanations
        aiExplanationsMap.clear();
      }
    });
  }
  
  // Update scope detail buttons based on AI state with lazy loading
  function updateScopeButtons(useAI, aiExplanationsMap, scopes) {
    // Find all scope detail sections and update their button text/icon
    const allDetails = document.querySelectorAll('details');
    allDetails.forEach(details => {
      const summary = details.querySelector('summary');
      if (!summary || !summary.textContent.includes('explains')) return;
      
      // Get the scope name from the parent container
      const scopeContainer = details.closest('[style*="border-left"]');
      if (!scopeContainer) return;
      
      const scopeNameEl = scopeContainer.querySelector('strong');
      if (!scopeNameEl) return;
      
      const scopeName = scopeNameEl.textContent.trim();
      const scopeNameLower = scopeName.toLowerCase();
      
      if (useAI) {
        // Change to AI explains button
        summary.innerHTML = `
          <span style="font-size: 14px;">🤖</span>
          <span>AI explains</span>
          <span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; margin-left: 4px;">REAL AI</span>
        `;
        
        // Set up lazy loading: fetch AI explanation on first open
        // Only add listener if not already added
        if (!details.hasAttribute('data-ai-lazy-loader-attached')) {
          details.setAttribute('data-ai-lazy-loader-attached', 'true');
          let hasLoaded = false;
          
          details.addEventListener('toggle', async function loadAIExplanation() {
            if (!details.open || hasLoaded) return;
            
            // Check if we already have cached explanation
            if (aiExplanationsMap.has(scopeNameLower)) {
              const aiExplanation = aiExplanationsMap.get(scopeNameLower);
              updateExplanationContent(details, aiExplanation, true);
              hasLoaded = true;
              return;
            }
            
            // Show loading state
            const contentDiv = details.querySelector('div[style*="margin-top"]');
            if (!contentDiv) return;
            
            const originalContent = contentDiv.innerHTML;
            contentDiv.innerHTML = `
              <div style="text-align: center; padding: 30px;">
                <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
                <div style="font-size: 14px; font-weight: 600; color: #7c3aed; margin-bottom: 8px;">Loading AI Explanation...</div>
                <div style="font-size: 12px; color: #666;">Fetching personalized insights...</div>
              </div>
            `;
            
            try {
              // Fetch AI explanation
              const aiExplanation = await getAIScopeExplanation(scopeName);
              
              if (aiExplanation) {
                // Cache it
                aiExplanationsMap.set(scopeNameLower, aiExplanation);
                
                // Update content with AI explanation
                updateExplanationContent(details, aiExplanation, true);
                hasLoaded = true;
              } else {
                // Failed to get AI explanation, restore original
                contentDiv.innerHTML = originalContent;
                console.warn('Failed to get AI explanation for:', scopeName);
              }
            } catch (error) {
              console.error('Error loading AI explanation:', error);
              // Restore original content on error
              contentDiv.innerHTML = originalContent;
            }
          });
        }
      } else {
        // Change back to Security expert explains
        summary.innerHTML = `
          <span style="font-size: 14px;">👨‍💼</span>
          <span>Security expert explains</span>
        `;
        
        // Restore expert explanation if it was replaced with AI
        const contentDiv = details.querySelector('div[style*="margin-top"]');
        if (contentDiv && contentDiv.querySelector('[data-ai-loaded="true"]')) {
          const expertExplanation = getExpertExplanation(scopeName);
          updateExplanationContent(details, expertExplanation, false);
        }
      }
    });
  }
  
  // Helper function to update explanation content in details element
  function updateExplanationContent(details, explanation, isAI) {
    const contentDiv = details.querySelector('div[style*="margin-top"]');
    if (!contentDiv) return;
    
    contentDiv.setAttribute('data-ai-loaded', isAI ? 'true' : 'false');
    contentDiv.innerHTML = `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 6px;">💬 In plain English:</div>
        <div style="color: #374151;">${escapeHtml(explanation.plainEnglish)}</div>
      </div>
      
      <div style="margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 6px;">📋 What this allows:</div>
        <div style="color: #374151;">${escapeHtml(explanation.whatItMeans)}</div>
      </div>
      
      <div style="margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 6px;">💡 Things to consider:</div>
        <div style="color: #374151;">${escapeHtml(explanation.alternatives)}</div>
      </div>
      
      <div style="padding: 10px 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">
        <div style="font-size: 13px; font-weight: 600; color: #10b981; margin-bottom: 4px;">🌍 Real-world comparison:</div>
        <div style="color: #374151; font-style: italic;">"${escapeHtml(explanation.realWorld)}"</div>
      </div>
    `;
  }
  
  // Setup error AI analysis checkbox
  async function setupErrorAICheckbox(error, explanation) {
    const checkbox = document.getElementById('enable-error-ai-analysis');
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    
    if (!checkbox) return;
    
    let isLoading = false;
    
    checkbox.addEventListener('change', async (e) => {
      if (isLoading) return;
      
      const resultsContainer = document.getElementById('error-ai-results');
      if (!resultsContainer) return;
      
      if (e.target.checked) {
        // Show loading state
        isLoading = true;
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
            <div style="font-size: 14px; font-weight: 600; color: #7c3aed; margin-bottom: 8px;">AI Analysis in Progress...</div>
            <div style="font-size: 12px; color: #666;">Analyzing OAuth error with AI...</div>
          </div>
        `;
        
        try {
          // Get the stored model
          const result = await browserAPI.storage.local.get(['aiModel']);
          const selectedModel = result.aiModel || 'claude-sonnet-4-20250514';
          
          // Request AI analysis from background script
          chrome.runtime.sendMessage({
            action: 'getAIAnalysis',
            errorCode: error.error,
            errorDescription: error.description,
            existingExplanation: explanation,
            model: selectedModel
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('OAuth Doctor: AI request failed', chrome.runtime.lastError);
              resultsContainer.innerHTML = `
                <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
                  <p style="margin: 0; color: #c62828; font-size: 13px;">
                    ❌ ${chrome.runtime.lastError.message}
                  </p>
                </div>
              `;
              isLoading = false;
              return;
            }
            
            if (!response) {
              resultsContainer.innerHTML = `
                <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
                  <p style="margin: 0; color: #c62828; font-size: 13px;">
                    ❌ No response from background script
                  </p>
                </div>
              `;
              isLoading = false;
              return;
            }
            
            if (response.success) {
              // Validate we have content
              if (!response.analysis || response.analysis.trim() === '') {
                resultsContainer.innerHTML = `
                  <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
                    <p style="margin: 0; color: #c62828; font-size: 13px;">
                      ⚠️ Model returned empty response. Try a different model in extension settings.
                    </p>
                  </div>
                `;
                isLoading = false;
                return;
              }
              
              // Format the AI response
              const formattedAnalysis = response.analysis
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              
              const modelDisplayName = response.model ? getModelDisplayName(response.model) : 'AI';
              
              resultsContainer.innerHTML = `
                <div style="background: #faf5ff; border: 2px solid #e9d5ff; border-radius: 8px; padding: 16px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">🤖</span>
                    <strong style="font-size: 14px; color: #7c3aed;">AI-Enhanced Troubleshooting</strong>
                    <span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700;">REAL AI</span>
                  </div>
                  <div style="font-size: 13px; color: #374151; line-height: 1.6;">
                    <p>${formattedAnalysis}</p>
                  </div>
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9d5ff; font-size: 11px; color: #888;">
                    ✨ Powered by ${modelDisplayName} • ${new Date(response.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              `;
            } else {
              const errorDetails = response.error || 'Unknown error occurred';
              resultsContainer.innerHTML = `
                <div style="background: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; padding: 16px;">
                  <p style="margin: 0 0 10px 0; color: #e65100; font-size: 13px;">
                    <strong>⚠️ AI Analysis Failed</strong>
                  </p>
                  <p style="margin: 0; color: #e65100; font-size: 12px;">
                    ${errorDetails}
                  </p>
                </div>
              `;
            }
            
            isLoading = false;
          });
        } catch (error) {
          console.error('Error during AI analysis:', error);
          resultsContainer.innerHTML = `
            <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #c62828; font-size: 13px;">
                ❌ AI analysis failed. Please try again.
              </p>
            </div>
          `;
          isLoading = false;
        }
      } else {
        // Hide AI results
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
      }
    });
  }
  
  // Get display name for model
  function getModelDisplayName(modelId) {
    const modelNames = {
      'claude-sonnet-4-20250514': 'Claude Sonnet 4',
      'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
      'claude-3-5-sonnet-20241022': 'Claude Sonnet 3.5',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini'
    };
    return modelNames[modelId] || modelId;
  }

  // Initialize the OAuth Doctor
  async function initialize() {
    console.log('OAuth Doctor: Initializing on', window.location.href);
    
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    
    // Only proceed if this is an OAuth-related page
    const isOAuthRelatedUrl = 
      path.includes('/setup/secur/remoteaccessauthorizationpage.apexp') ||
      path.includes('/setup/secur/remoteaccesserrorpage.apexp') ||
      path.includes('/services/oauth2/authorize') ||
      path.includes('/services/oauth2/token') ||
      url.includes('error=') && (path.includes('/oauth') || path.includes('remoteaccess'));
    
    if (!isOAuthRelatedUrl) {
      console.log('OAuth Doctor: Not an OAuth-related page, skipping auto-popup');
      return;
    }
    
    console.log('OAuth Doctor: OAuth-related page detected, proceeding with analysis');
    
    // Check for OAuth errors first (higher priority)
    const error = checkForOAuthError();
    if (error) {
      console.log('OAuth Doctor: Error detected', error);
      await createAnalyzerOverlay(null, null, error);
      return;
    }
    
    // Check for scopes (only on authorization pages)
    // Note: /services/oauth2/authorize is often used for errors, so we don't auto-popup there
    if (path.includes('remoteaccessauthorizationpage.apexp')) {
      const scopes = extractScopes();
      if (scopes.length > 0) {
        console.log('OAuth Doctor: Scopes detected', scopes);
        
        // Analyze scopes and create overlay (async)
        (async () => {
          const analysis = analyzeScopes(scopes);
          console.log('OAuth Doctor: Scope analysis', analysis);
          
          // Create overlay (no loading popup - AI is on-demand)
          await createAnalyzerOverlay(scopes, analysis, null);
        })();
        return;
      }
      
      // If on OAuth authorization page but no scopes found yet, wait and try again
      // (scopes might load dynamically)
      if (isOAuthAuthorizationPage()) {
        console.log('OAuth Doctor: Authorization page detected, waiting for scopes to load...');
        
        setTimeout(async () => {
          const delayedScopes = extractScopes();
          if (delayedScopes.length > 0) {
            console.log('OAuth Doctor: Scopes found after delay', delayedScopes);
            
            const analysis = analyzeScopes(delayedScopes);
            
            // Create overlay (no loading popup - AI is on-demand)
            await createAnalyzerOverlay(delayedScopes, analysis, null);
          } else {
            console.log('OAuth Doctor: No scopes found on authorization page');
          }
        }, 1000); // Wait 1 second for page to fully render
      }
    } else if (path.includes('/services/oauth2/authorize')) {
      // For /services/oauth2/authorize endpoint, check for scopes or errors
      // (this endpoint is often used for errors that appear in page content)
      console.log('OAuth Doctor: Checking authorize endpoint for scopes or errors...');
      
      const scopes = extractScopes();
      if (scopes.length > 0) {
        console.log('OAuth Doctor: Scopes detected on authorize endpoint', scopes);
        
        // Analyze scopes and create overlay (async)
        (async () => {
          const analysis = analyzeScopes(scopes);
          console.log('OAuth Doctor: Scope analysis', analysis);
          
          // Create overlay (no loading popup - AI is on-demand)
          await createAnalyzerOverlay(scopes, analysis, null);
        })();
      } else {
        console.log('OAuth Doctor: No scopes found on authorize endpoint');
        
        // Wait a moment and check again for errors in page content
        // (errors might load dynamically after initial page load)
        setTimeout(() => {
          console.log('OAuth Doctor: Checking again for errors in page content...');
          const delayedError = checkForOAuthError();
          if (delayedError) {
            console.log('OAuth Doctor: Error detected in page content after delay', delayedError);
            createAnalyzerOverlay(null, null, delayedError);
          } else {
            console.log('OAuth Doctor: No errors found on authorize endpoint');
          }
        }, 500); // Wait 500ms for page content to fully render
      }
    } else if (path.includes('/services/oauth2/token')) {
      // For /services/oauth2/token endpoint, check for errors
      // (this endpoint typically returns JSON error responses)
      console.log('OAuth Doctor: Checking token endpoint for errors...');
      
      // Wait a moment for page content to fully render
      setTimeout(() => {
        console.log('OAuth Doctor: Checking for errors in token endpoint response...');
        const tokenError = checkForOAuthError();
        if (tokenError) {
          console.log('OAuth Doctor: Error detected on token endpoint', tokenError);
          createAnalyzerOverlay(null, null, tokenError);
        } else {
          console.log('OAuth Doctor: No errors found on token endpoint');
        }
      }, 300); // Wait 300ms for JSON response to render
    } else {
      console.log('OAuth Doctor: OAuth page but not an authorization page, no auto-popup');
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Also monitor for dynamic page changes (SPAs)
  // Use a flag to prevent multiple simultaneous initializations
  let isInitializing = false;
  let lastUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href && !isInitializing) {
      lastUrl = window.location.href;
      isInitializing = true;
      setTimeout(() => {
        initialize();
        isInitializing = false;
      }, 500); // Delay to let page render
    }
  });

  // Only observe if body exists (avoid errors)
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze') {
      initialize();
      sendResponse({ success: true });
    }
  });

})();

