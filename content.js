// OAuth Doctor - Content Script
// Detects OAuth flows and injects analysis UI

(function() {
  'use strict';

  // Scope risk mapping
  const SCOPE_RISK_LEVELS = {
    // High Risk - Full access scopes
    'full': { level: 'high', description: 'Full access to all data and operations', color: '#dc3545' },
    'web': { level: 'high', description: 'Full web-based access', color: '#dc3545' },
    'refresh_token': { level: 'medium-high', description: 'Allows long-term access without re-authentication', color: '#fd7e14' },
    'offline_access': { level: 'medium-high', description: 'Access when user is offline', color: '#fd7e14' },
    
    // Medium Risk
    'api': { level: 'medium', description: 'Standard API access to read/write data', color: '#ffc107' },
    'chatter_api': { level: 'medium', description: 'Access to Chatter feeds and messages', color: '#ffc107' },
    'content': { level: 'medium', description: 'Access to Salesforce CRM Content', color: '#ffc107' },
    'cdp_query_api': { level: 'medium', description: 'Query Customer Data Platform', color: '#ffc107' },
    'cdp_ingest_api': { level: 'medium', description: 'Ingest data into CDP', color: '#ffc107' },
    'cdp_profile_api': { level: 'medium', description: 'Access CDP profiles', color: '#ffc107' },
    'cdp_segment_api': { level: 'medium', description: 'Access CDP segments', color: '#ffc107' },
    'custom_permissions': { level: 'medium', description: 'Execute custom permissions', color: '#ffc107' },
    'wave_api': { level: 'medium', description: 'Access Einstein Analytics', color: '#ffc107' },
    'eclair_api': { level: 'medium', description: 'Access Einstein Analytics data', color: '#ffc107' },
    'cdp_api': { level: 'medium', description: 'Customer Data Platform API access', color: '#ffc107' },
    'forgot_password': { level: 'medium', description: 'Password reset functionality', color: '#ffc107' },
    'pwdless_login_api': { level: 'medium', description: 'Passwordless login capability', color: '#ffc107' },
    
    // Low Risk - Read-only and limited scopes
    'openid': { level: 'low', description: 'Basic identity information (OpenID)', color: '#28a745' },
    'id': { level: 'low', description: 'Unique identifier and basic profile', color: '#28a745' },
    'profile': { level: 'low', description: 'User profile information', color: '#28a745' },
    'email': { level: 'low', description: 'User email address', color: '#28a745' },
    'address': { level: 'low', description: 'User address information', color: '#28a745' },
    'phone': { level: 'low', description: 'User phone number', color: '#28a745' },
    'visualforce': { level: 'low', description: 'Access Visualforce pages', color: '#28a745' },
    'pardot_api': { level: 'low', description: 'Pardot marketing automation', color: '#28a745' },
    'user_registration_api': { level: 'low', description: 'User registration functionality', color: '#28a745' }
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
    const url = window.location.href;
    const path = window.location.pathname;
    
    // Check URL patterns
    if (url.includes('/services/oauth2/authorize') || 
        path.includes('/setup/secur/RemoteAccessAuthorizationPage.apexp')) {
      return true;
    }
    
    // Check for OAuth approval elements
    const hasApprovalButton = document.querySelector('input[name="approve"], button[name="approve"], input[value="Allow"], input[value="Authorize"]');
    const hasDenyButton = document.querySelector('input[name="decline"], button[name="decline"], input[value="Deny"]');
    const hasOAuthScope = document.body.textContent.includes('requesting access') || 
                          document.body.textContent.includes('will allow') ||
                          document.body.textContent.includes('This application will be able to');
    
    return hasApprovalButton && (hasDenyButton || hasOAuthScope);
  }

  // Extract scopes from URL or page content
  function extractScopes() {
    const scopes = new Set();
    
    // Try to get from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope');
    
    if (scopeParam) {
      scopeParam.split(/[\s,]+/).forEach(scope => {
        if (scope) scopes.add(scope.toLowerCase().trim());
      });
    }
    
    // Try to extract from page content
    const pageText = document.body.textContent;
    Object.keys(SCOPE_RISK_LEVELS).forEach(scope => {
      if (pageText.includes(scope)) {
        scopes.add(scope);
      }
    });
    
    return Array.from(scopes);
  }

  // Analyze scopes and categorize by risk
  function analyzeScopes(scopes) {
    const analysis = {
      high: [],
      'medium-high': [],
      medium: [],
      low: [],
      unknown: []
    };
    
    scopes.forEach(scope => {
      const scopeInfo = SCOPE_RISK_LEVELS[scope];
      if (scopeInfo) {
        analysis[scopeInfo.level].push({
          name: scope,
          ...scopeInfo
        });
      } else {
        analysis.unknown.push({
          name: scope,
          level: 'unknown',
          description: 'Unknown scope - review carefully',
          color: '#6c757d'
        });
      }
    });
    
    return analysis;
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
    // Remove existing overlay if present
    const existing = document.getElementById('oauth-doctor-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'oauth-doctor-overlay';
    overlay.className = 'oauth-doctor-overlay';
    
    let content = '';
    
    // Error section
    if (error) {
      const { explanation } = error;
      content += `
        <div class="oauth-doctor-error">
          <div class="oauth-doctor-error-header">
            <span class="oauth-doctor-icon">⚠️</span>
            <h3>${explanation.title}</h3>
          </div>
          <p class="oauth-doctor-error-description">${explanation.description}</p>
          ${error.description ? `<p class="oauth-doctor-error-details"><strong>Details:</strong> ${error.description}</p>` : ''}
          <div class="oauth-doctor-fix">
            <h4>How to Fix:</h4>
            <ol>
              ${explanation.fix.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
      `;
    }
    
    // Scope analysis section
    if (scopes && scopes.length > 0) {
      const hasHighRisk = analysis.high.length > 0;
      const hasMediumHighRisk = analysis['medium-high'].length > 0;
      
      content += `
        <div class="oauth-doctor-scope-analysis">
          <div class="oauth-doctor-header">
            <span class="oauth-doctor-icon">🔒</span>
            <h3>OAuth Scope Analysis</h3>
          </div>
          
          ${hasHighRisk || hasMediumHighRisk ? `
            <div class="oauth-doctor-warning">
              <strong>⚠️ High-Risk Permissions Detected!</strong><br>
              This app is requesting powerful permissions. Only approve if you trust this application.
            </div>
          ` : ''}
          
          <div class="oauth-doctor-scopes">
            ${renderScopeCategory('🔴 High Risk', analysis.high)}
            ${renderScopeCategory('🟠 Medium-High Risk', analysis['medium-high'])}
            ${renderScopeCategory('🟡 Medium Risk', analysis.medium)}
            ${renderScopeCategory('🟢 Low Risk', analysis.low)}
            ${renderScopeCategory('⚪ Unknown', analysis.unknown)}
          </div>
          
          <div class="oauth-doctor-summary">
            <strong>Total Scopes:</strong> ${scopes.length} | 
            <strong>High Risk:</strong> ${analysis.high.length + analysis['medium-high'].length} | 
            <strong>Medium Risk:</strong> ${analysis.medium.length} | 
            <strong>Low Risk:</strong> ${analysis.low.length}
          </div>
        </div>
      `;
    }
    
    overlay.innerHTML = `
      <div class="oauth-doctor-container">
        <div class="oauth-doctor-header-bar">
          <div class="oauth-doctor-title">
            <span class="oauth-doctor-logo">🩺</span>
            <span>OAuth Doctor</span>
          </div>
          <button class="oauth-doctor-close" id="oauth-doctor-close">✕</button>
        </div>
        ${content || '<p class="oauth-doctor-no-data">No OAuth data detected on this page.</p>'}
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add close button handler
    document.getElementById('oauth-doctor-close').addEventListener('click', () => {
      overlay.remove();
    });
    
    // Close on outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  function renderScopeCategory(title, scopes) {
    if (scopes.length === 0) return '';
    
    return `
      <div class="oauth-doctor-scope-category">
        <h4>${title}</h4>
        <ul>
          ${scopes.map(scope => `
            <li>
              <span class="oauth-doctor-scope-badge" style="background-color: ${scope.color}"></span>
              <strong>${scope.name}</strong>
              <p>${scope.description}</p>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Initialize the OAuth Doctor
  function initialize() {
    // Check for OAuth errors first (higher priority)
    const error = checkForOAuthError();
    if (error) {
      console.log('OAuth Doctor: Error detected', error);
      createAnalyzerOverlay(null, null, error);
      return;
    }
    
    // Check if on OAuth authorization page
    if (isOAuthAuthorizationPage()) {
      console.log('OAuth Doctor: Authorization page detected');
      const scopes = extractScopes();
      
      if (scopes.length > 0) {
        const analysis = analyzeScopes(scopes);
        console.log('OAuth Doctor: Scope analysis', analysis);
        createAnalyzerOverlay(scopes, analysis, null);
      } else {
        console.log('OAuth Doctor: No scopes detected');
      }
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Also monitor for dynamic page changes (SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      setTimeout(initialize, 500); // Delay to let page render
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze') {
      initialize();
      sendResponse({ success: true });
    }
  });

})();

