// OAuth Doctor - Scope Analysis Module
// Handles OAuth scope extraction, risk analysis, and anomaly detection

(function(window) {
  'use strict';

  // Scope risk mapping
  const SCOPE_RISK_LEVELS = {
    // CRITICAL
    'full': { level: 'CRITICAL', score: 10, description: 'Complete access to all data and operations', color: '#d32f2f' },
    // HIGH RISK
    'api': { level: 'HIGH', score: 8, description: 'Full API access to read/write data', color: '#f57c00' },
    'refresh_token': { level: 'HIGH', score: 8, description: 'Long-term access without re-authentication', color: '#f57c00' },
    'offline_access': { level: 'HIGH', score: 8, description: 'Access when user is offline', color: '#f57c00' },
    'web': { level: 'HIGH', score: 7, description: 'Web-based access to user data', color: '#f57c00' },
    'visualforce': { level: 'HIGH', score: 7, description: 'Visualforce pages access', color: '#f57c00' },
    // MEDIUM-HIGH RISK
    'cdp_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Customer Data Platform access', color: '#ff9800' },
    'cdp_ingest_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Ingest data into CDP', color: '#ff9800' },
    'cdp_profile_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Access customer profiles', color: '#ff9800' },
    'cdp_query_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Query CDP data', color: '#ff9800' },
    'einstein_gpt_api': { level: 'MEDIUM-HIGH', score: 6, description: 'AI/GPT functionality access', color: '#ff9800' },
    'wave_rest_api': { level: 'MEDIUM-HIGH', score: 6, description: 'Analytics/Wave API access', color: '#ff9800' },
    // MEDIUM RISK
    'profile': { level: 'MEDIUM', score: 5, description: 'Access to user profile information', color: '#fbc02d' },
    'email': { level: 'MEDIUM', score: 5, description: 'Access to email address', color: '#fbc02d' },
    'address': { level: 'MEDIUM', score: 5, description: 'Access to physical address', color: '#fbc02d' },
    'phone': { level: 'MEDIUM', score: 5, description: 'Access to phone number', color: '#fbc02d' },
    'openid': { level: 'MEDIUM', score: 4, description: 'OpenID authentication', color: '#fbc02d' },
    // MEDIUM-LOW RISK
    'chatter_api': { level: 'MEDIUM-LOW', score: 4, description: 'Chatter social features access', color: '#afb42b' },
    'content': { level: 'MEDIUM-LOW', score: 4, description: 'Content management access', color: '#afb42b' },
    'lightning': { level: 'MEDIUM-LOW', score: 4, description: 'Lightning component access', color: '#afb42b' },
    'vf': { level: 'MEDIUM-LOW', score: 4, description: 'Visualforce pages access', color: '#afb42b' },
    'custom_permissions': { level: 'MEDIUM-LOW', score: 4, description: 'Custom permission access', color: '#afb42b' },
    'pardot_api': { level: 'MEDIUM-LOW', score: 4, description: 'Pardot marketing access', color: '#afb42b' },
    'interaction_api': { level: 'MEDIUM-LOW', score: 4, description: 'Interaction tracking access', color: '#afb42b' },
    // LOW RISK
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

  // Description-to-scope mapping
  const DESCRIPTION_TO_SCOPE = {
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

  // Extract scopes from URL or page content
  function extractScopes() {
    const scopes = new Set();
    
    // Try URL parameter first (primary source)
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope');
    
    if (scopeParam) {
      const urlScopes = scopeParam.split(/[\s,]+/).filter(s => s.trim());
      urlScopes.forEach(scope => scopes.add(scope.toLowerCase().trim()));
      
      if (scopes.size > 0) {
        return Array.from(scopes);
      }
    }
    
    // Parse from page content
    const selectors = [
      '.contentDiv li', '.scopesList li', '[id*="scope"] li', '.oauthScopes li',
      '[class*="scope"] li', '.permissionList li', 'ul li', 'div[class*="content"] li',
      '.slds-list li', '.slds-scope li'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          let count = 0;
          elements.forEach(el => {
            let text = el.textContent.trim().split(/[:(]/)[0].trim();
            
            if (text && text.length > 0 && text.length < 200) {
              const normalized = text.toLowerCase();
              let matched = false;
              
              // Try description mapping
              for (const [desc, scopeName] of Object.entries(DESCRIPTION_TO_SCOPE)) {
                if (normalized.includes(desc)) {
                  scopes.add(scopeName);
                  count++;
                  matched = true;
                  break;
                }
              }
              
              // Try direct scope name matching
              if (!matched) {
                const normalizedUnderscore = normalized.replace(/\s+/g, '_');
                for (const knownScope of Object.keys(SCOPE_RISK_LEVELS)) {
                  if (normalizedUnderscore.includes(knownScope.replace(/-/g, '_'))) {
                    scopes.add(knownScope);
                    count++;
                    matched = true;
                    break;
                  }
                }
              }
              
              // Add raw text if looks like scope name
              if (!matched && text.match(/^[a-zA-Z_]+$/)) {
                scopes.add(text.toLowerCase());
                count++;
              }
            }
          });
          if (count > 0) break;
        }
      } catch (e) {
        console.error('Selector failed:', selector, e);
      }
    }
    
    return Array.from(scopes);
  }

  // Analyze scopes and categorize by risk
  function analyzeScopes(scopes) {
    const analyses = scopes.map(scope => {
      const normalized = scope.toLowerCase().replace(/[^a-z_]/g, '_');
      
      for (const [key, risk] of Object.entries(SCOPE_RISK_LEVELS)) {
        if (normalized.includes(key.replace(/-/g, '_'))) {
          return { scope, ...risk };
        }
      }
      
      return {
        scope,
        level: 'UNKNOWN',
        score: 5,
        description: 'Unknown scope - review manually',
        color: '#9e9e9e'
      };
    }).sort((a, b) => b.score - a.score);
    
    return analyses;
  }

  // Calculate overall risk score
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

  // Detect security anomalies
  function detectAnomalies(analyses) {
    const anomalies = [];
    const scopeNames = analyses.map(a => a.scope.toLowerCase());
    
    // Full access detected
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
    
    // Multiple high-risk scopes
    const highRiskScopes = analyses.filter(a => a.score >= 7);
    const highRiskCount = highRiskScopes.length;
    if (highRiskCount >= 3) {
      anomalies.push({
        severity: 'HIGH',
        icon: '⚠️',
        title: 'Multiple High-Risk Permissions',
        message: `This app requests ${highRiskCount} high-risk scopes. Most apps need only 1-2 high-risk permissions.`,
        recommendation: 'Review each scope carefully. Consider contacting the app publisher to understand why so many permissions are needed.',
        color: '#f57c00'
      });
    }
    
    // Refresh token + broad access
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
    
    // Excessive scope count
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
    
    // PII collection pattern
    const hasPII = ['profile', 'email', 'address', 'phone'].filter(s => 
      scopeNames.some(scope => scope.includes(s))
    ).length;
    if (hasPII >= 3) {
      anomalies.push({
        severity: 'MEDIUM',
        icon: '👤',
        title: 'Comprehensive Personal Data Collection',
        message: `This app is collecting ${hasPII} types of personal information (profile, email, address, phone).`,
        recommendation: 'Verify the app has a clear privacy policy and legitimate need for your personal information.',
        color: '#ff9800'
      });
    }
    
    // Positive pattern - only low-risk scopes
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
    
    return anomalies;
  }

  // Get expert explanation for a scope
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
    
    for (const [key, explanation] of Object.entries(expertExplanations)) {
      if (normalized.includes(key.replace(/-/g, '_'))) {
        return explanation;
      }
    }
    
    return {
      plainEnglish: "This is a specialized OAuth scope",
      whatItMeans: "The app is requesting access to a specific Salesforce feature or API",
      alternatives: "Review the app's documentation to understand why this permission is needed",
      realWorld: "Similar to granting access to a specific feature in an app"
    };
  }

  // Get approval recommendation
  function getApprovalRecommendation(riskLevel) {
    const recommendations = {
      'CRITICAL': {
        icon: '🚨',
        title: 'NOT RECOMMENDED',
        message: 'This app requests FULL ACCESS to your Salesforce org. Only approve if you completely trust this application and understand the implications.',
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

  // Export to global namespace
  window.OAuthScopeAnalyzer = {
    SCOPE_RISK_LEVELS,
    extractScopes,
    analyzeScopes,
    calculateOverallRisk,
    detectAnomalies,
    getExpertExplanation,
    getApprovalRecommendation
  };

})(window);

