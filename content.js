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
    const scopes = new Set();
    
    // Try to get from URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope');
    
    if (scopeParam) {
      console.log('Found scope parameter in URL:', scopeParam);
      scopeParam.split(/[\s,]+/).forEach(scope => {
        if (scope) scopes.add(scope.toLowerCase().trim());
      });
    }
    
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
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          elements.forEach(el => {
            let text = el.textContent.trim();
            // Clean up text - remove extra descriptions
            text = text.split(/[:(]/)[0].trim();
            
            // Only add if it looks like a scope (reasonable length, no full sentences)
            if (text && text.length > 0 && text.length < 100 && !text.includes('.')) {
              const normalized = text.toLowerCase().replace(/\s+/g, '_');
              // Check if this matches a known scope
              for (const knownScope of Object.keys(SCOPE_RISK_LEVELS)) {
                if (normalized.includes(knownScope.replace(/-/g, '_')) || knownScope.includes(normalized)) {
                  scopes.add(knownScope);
                  break;
                }
              }
              // Also add the raw text if it looks like a scope
              if (text.match(/^[a-zA-Z_]+$/)) {
                scopes.add(text.toLowerCase());
              }
            }
          });
          if (scopes.size > 0) {
            console.log('Found scopes from elements:', Array.from(scopes));
            break; // Found scopes, no need to try other selectors
          }
        }
      } catch (e) {
        console.log(`Selector failed: ${selector}`, e);
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
    const analyses = scopes.map(scope => {
      const normalized = scope.toLowerCase().replace(/[^a-z_]/g, '_');
      
      // Try exact match first
      for (const [key, risk] of Object.entries(SCOPE_RISK_LEVELS)) {
        if (normalized.includes(key.replace(/-/g, '_'))) {
          return { scope: scope, ...risk };
        }
      }
      
      // Default for unknown scopes
      return {
        scope: scope,
        level: 'UNKNOWN',
        score: 5,
        description: 'Unknown scope - review manually',
        color: '#9e9e9e'
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
    
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
    
    const finalError = error || hashError;
    const finalDescription = errorDescription || hashErrorDescription;
    
    if (finalError) {
      return {
        error: finalError,
        description: finalDescription,
        uri: errorUri,
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

  // Create the analyzer overlay
  function createAnalyzerOverlay(scopes, analysis, error) {
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
    
    let contentHTML = '';
    
    // Build error diagnosis section
    if (error) {
      const { explanation } = error;
      contentHTML += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 15px 0; font-size: 16px; color: #333; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">⚠️</span>
            <span>${explanation.title}</span>
          </h4>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.6;">
            ${explanation.description}
          </p>
          ${error.description ? `
            <div style="padding: 12px; background: #f5f5f5; border-radius: 8px; margin: 12px 0;">
              <strong style="font-size: 13px; color: #555;">Details:</strong>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${error.description}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; border: 2px solid #e0e0e0;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #333;">💡 How to Fix:</h4>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #555; line-height: 1.8;">
              ${explanation.fix.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
            </ol>
          </div>
          
          <div class="oauth-doctor-ai-section" id="ai-analysis-section" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <h4 style="margin: 0 0 12px 0; font-size: 15px; color: #667eea; display: flex; align-items: center; gap: 6px;">
              🤖 AI-Powered Analysis
            </h4>
            <div class="oauth-doctor-ai-trigger">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; line-height: 1.5;">
                Get personalized troubleshooting advice from AI based on Salesforce documentation.
              </p>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <label style="font-size: 13px; font-weight: 600; color: #555; white-space: nowrap;" for="ai-model-select">Select Model:</label>
                <select id="ai-model-select" class="oauth-doctor-model-dropdown" style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Best)</option>
                  <option value="claude-3-7-sonnet-20250219">Claude Sonnet 3.7</option>
                  <option value="claude-3-5-sonnet-20241022">Claude Sonnet 3.5</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fastest)</option>
                </select>
              </div>
              <button id="trigger-ai-analysis" class="oauth-doctor-ai-button" 
                style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <span style="font-size: 16px;">✨</span>
                <span>Analyze with AI</span>
              </button>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #999; font-style: italic; text-align: center;">
                Note: AI analysis uses API tokens
              </p>
            </div>
          </div>
        </div>
      `;
      
      // Set up AI analysis button after rendering
      setTimeout(() => {
        setupAIAnalysisButton(error, explanation);
      }, 100);
    }
    
    // Build scope analysis section (teammate's design)
    if (scopes && scopes.length > 0) {
      const scopesHTML = analysis.map(scope => `
        <div style="padding: 12px; margin: 8px 0; border-left: 4px solid ${scope.color}; background: ${scope.color}15; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <strong style="color: ${scope.color}; font-size: 13px; text-transform: uppercase;">
              ${scope.scope}
            </strong>
            <span style="background: ${scope.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
              ${scope.level}
            </span>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #555;">
            ${scope.description}
          </p>
          <div style="margin-top: 5px; font-size: 11px; color: #666;">
            Risk Score: ${scope.score}/10
          </div>
        </div>
      `).join('');
      
      contentHTML += `
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333; text-transform: uppercase; letter-spacing: 0.5px;">
            Requested Permissions (${analysis.length})
          </h4>
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5;">
            This application is requesting the following OAuth scopes. Review carefully before approving.
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
    
    // Build complete popup with teammate's colorful bordered design
    overlay.innerHTML = `
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
          padding: 20px 24px;
          color: white;
          position: relative;
          overflow: hidden;
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
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); line-height: 1.3;">
                🩺 OAuth Doctor<br>Security Diagnosis
              </h3>
              <div style="font-size: 14px; opacity: 0.95; font-weight: 600;">
                Overall Risk: <strong style="font-size: 16px; text-decoration: underline;">${overallRisk.level}</strong> ${overallRisk.score !== 'N/A' ? `(${overallRisk.score}/10)` : ''}
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
        <div style="padding: 20px; overflow-y: auto; max-height: calc(90vh - 120px);">
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
          
          ${contentHTML || '<p style="text-align: center; color: #999; padding: 40px 20px;">No OAuth data detected.</p>'}
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add close button handler with smooth animation
    document.getElementById('oauth-doctor-close').addEventListener('click', () => {
      closeOverlay(overlay);
    });
    
    // Optional: Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeOverlay(overlay);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }
  
  // Smooth close animation
  function closeOverlay(overlay) {
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.remove();
    }, 300); // Match animation duration
  }
  
  // Setup AI analysis button
  function setupAIAnalysisButton(error, explanation) {
    const button = document.getElementById('trigger-ai-analysis');
    const modelSelect = document.getElementById('ai-model-select');
    
    if (!button || !modelSelect) return;
    
    // Load saved model preference
    chrome.storage.sync.get(['preferredModel'], (result) => {
      if (result.preferredModel) {
        modelSelect.value = result.preferredModel;
      }
    });
    
    // Save model preference on change
    modelSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ preferredModel: modelSelect.value });
    });
    
    button.addEventListener('click', () => {
      const selectedModel = modelSelect.value;
      requestAIAnalysis(error, explanation, selectedModel);
    });
  }
  
  // Request AI analysis for error
  function requestAIAnalysis(error, explanation, model) {
    console.log('OAuth Doctor: Requesting AI analysis with model:', model);
    console.log('OAuth Doctor: Error details:', error);
    
    // Show loading state
    const aiSection = document.getElementById('ai-analysis-section');
    if (!aiSection) return;
    
    aiSection.innerHTML = `
      <h4>🤖 AI-Powered Analysis</h4>
      <div class="oauth-doctor-ai-loading">
        <div class="oauth-doctor-spinner"></div>
        <p>Analyzing error with AI...</p>
        <small class="oauth-doctor-model-label">Using: ${getModelDisplayName(model)}</small>
      </div>
    `;
    
    chrome.runtime.sendMessage({
      action: 'getAIAnalysis',
      errorCode: error.error,
      errorDescription: error.description,
      existingExplanation: explanation,
      model: model
    }, (response) => {
      console.log('OAuth Doctor: Received response:', response);
      
      if (chrome.runtime.lastError) {
        console.error('OAuth Doctor: AI request failed', chrome.runtime.lastError);
        displayAIAnalysis({ success: false, error: chrome.runtime.lastError.message }, model, error, explanation);
        return;
      }
      
      // Additional validation
      if (!response) {
        console.error('OAuth Doctor: No response received');
        displayAIAnalysis({ success: false, error: 'No response from background script' }, model, error, explanation);
        return;
      }
      
      displayAIAnalysis(response, model, error, explanation);
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
      'gpt-5': 'GPT-5',
      'gpt-5-mini': 'GPT-5 Mini',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini'
    };
    return modelNames[modelId] || modelId;
  }
  
  // Display AI analysis results
  function displayAIAnalysis(response, model, error, explanation) {
    const aiSection = document.getElementById('ai-analysis-section');
    if (!aiSection) return;
    
    if (response.success) {
      // Validate we actually have content
      if (!response.analysis || response.analysis.trim() === '') {
        console.error('OAuth Doctor: Received empty analysis');
        displayAIAnalysis({ 
          success: false, 
          error: 'Model returned empty response. This model may not be available or hit a content filter.' 
        }, model, error, explanation);
        return;
      }
      
      // Format the AI response with better styling
      const formattedAnalysis = response.analysis
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/- (.*?)(<br>|<\/p>)/g, '<li>$1</li>');
      
      const modelDisplayName = model ? getModelDisplayName(model) : 'AI';
      
      aiSection.innerHTML = `
        <h4>🤖 AI-Powered Analysis</h4>
        <div class="oauth-doctor-ai-result">
          <p>${formattedAnalysis}</p>
          <div class="oauth-doctor-ai-footer">
            <small>✨ Powered by ${modelDisplayName} • ${new Date(response.timestamp).toLocaleTimeString()}</small>
          </div>
        </div>
      `;
    } else {
      // Show error with option to try another model
      const failedModelName = model ? getModelDisplayName(model) : 'Selected model';
      const errorDetails = response.error || 'Unknown error occurred';
      
      // Parse error to show user-friendly message
      let userFriendlyError = errorDetails;
      if (errorDetails.includes('empty response') || errorDetails.includes('empty')) {
        userFriendlyError = 'The model returned an empty response. It may not support this request type, hit a content filter, or be temporarily unavailable.';
      } else if (errorDetails.includes('temperature')) {
        userFriendlyError = 'This model doesn\'t support the current temperature setting. Try a different model.';
      } else if (errorDetails.includes('400')) {
        userFriendlyError = 'Bad request - the model may not support this request format.';
      } else if (errorDetails.includes('401') || errorDetails.includes('403')) {
        userFriendlyError = 'Authentication error. Please check your API key.';
      } else if (errorDetails.includes('404')) {
        userFriendlyError = 'Model not found or not available.';
      } else if (errorDetails.includes('429')) {
        userFriendlyError = 'Rate limit exceeded. Please try again in a moment.';
      } else if (errorDetails.includes('500')) {
        userFriendlyError = 'Server error. Please try again later.';
      } else if (errorDetails.includes('Invalid response structure')) {
        userFriendlyError = 'The API returned an unexpected response format. This model may not be compatible.';
      }
      
      aiSection.innerHTML = `
        <h4>🤖 AI-Powered Analysis</h4>
        <div class="oauth-doctor-ai-error">
          <p><strong>⚠️ ${failedModelName} failed</strong></p>
          <p class="oauth-doctor-error-message">${userFriendlyError}</p>
          <details class="oauth-doctor-error-details">
            <summary>Show technical details</summary>
            <pre>${errorDetails}</pre>
          </details>
          
          <div class="oauth-doctor-retry-section">
            <p><strong>Try a different model:</strong></p>
            <div class="oauth-doctor-model-selector">
              <label for="ai-model-retry">Select Model:</label>
              <select id="ai-model-retry" class="oauth-doctor-model-dropdown">
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
                <option value="claude-3-7-sonnet-20250219">Claude Sonnet 3.7</option>
                <option value="claude-3-5-sonnet-20241022">Claude Sonnet 3.5</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
            <button id="retry-ai-analysis" class="oauth-doctor-ai-button oauth-doctor-retry-button">
              <span class="button-icon">🔄</span>
              <span>Retry with Different Model</span>
            </button>
          </div>
        </div>
      `;
      
      // Set up retry button
      setTimeout(() => {
        setupRetryButton(error, explanation, model);
      }, 100);
    }
  }
  
  // Setup retry button for failed AI analysis
  function setupRetryButton(error, explanation, failedModel) {
    const retryButton = document.getElementById('retry-ai-analysis');
    const modelSelect = document.getElementById('ai-model-retry');
    
    if (!retryButton || !modelSelect) return;
    
    // Exclude the failed model from default selection
    if (failedModel) {
      // Try to select a different model
      const options = modelSelect.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value !== failedModel) {
          modelSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    retryButton.addEventListener('click', () => {
      const selectedModel = modelSelect.value;
      requestAIAnalysis(error, explanation, selectedModel);
    });
  }

  // Initialize the OAuth Doctor
  function initialize() {
    console.log('OAuth Doctor: Initializing on', window.location.href);
    
    // Check for OAuth errors first (higher priority)
    const error = checkForOAuthError();
    if (error) {
      console.log('OAuth Doctor: Error detected', error);
      createAnalyzerOverlay(null, null, error);
      return;
    }
    
    // Check for scopes
    const scopes = extractScopes();
    if (scopes.length > 0) {
      console.log('OAuth Doctor: Scopes detected', scopes);
      const analysis = analyzeScopes(scopes);
      console.log('OAuth Doctor: Scope analysis', analysis);
      createAnalyzerOverlay(scopes, analysis, null);
      return;
    }
    
    // If on OAuth authorization page but no scopes found yet, wait and try again
    // (scopes might load dynamically)
    if (isOAuthAuthorizationPage()) {
      console.log('OAuth Doctor: Authorization page detected, waiting for scopes to load...');
      setTimeout(() => {
        const delayedScopes = extractScopes();
        if (delayedScopes.length > 0) {
          console.log('OAuth Doctor: Scopes found after delay', delayedScopes);
          const analysis = analyzeScopes(delayedScopes);
          createAnalyzerOverlay(delayedScopes, analysis, null);
        } else {
          console.log('OAuth Doctor: No scopes found on authorization page');
        }
      }, 1000); // Wait 1 second for page to fully render
    } else {
      console.log('OAuth Doctor: Not an OAuth page, no errors or scopes detected');
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

