// OAuth Doctor - Error Analysis Module
// Handles OAuth error detection, diagnosis, and troubleshooting guidance

(function(window) {
  'use strict';

  // OAuth error patterns and explanations
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

  // Check for OAuth errors in URL, page content, or response body
  function checkForOAuthError() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const errorUri = urlParams.get('error_uri');
    
    // Check hash fragment (for implicit flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    
    let finalError = error || hashError;
    let finalDescription = errorDescription || hashErrorDescription;
    let finalUri = errorUri;
    
    // Check page content if no error in URL/hash
    const pathname = window.location.pathname.toLowerCase();
    if (!finalError && (pathname.includes('/services/oauth2/authorize') || pathname.includes('/services/oauth2/token'))) {
      
      // Handle XML responses (document.body might be null)
      if (!document.body) {
        try {
          const xmlSerializer = new XMLSerializer();
          const xmlString = xmlSerializer.serializeToString(document);
          
          // Extract error from XML using regex
          const errorMatch = xmlString.match(/<error>(.*?)<\/error>/i);
          const errorDescMatch = xmlString.match(/<error_description>(.*?)<\/error_description>/is);
          
          if (errorMatch) {
            finalError = errorMatch[1].trim().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          
          if (errorDescMatch) {
            finalDescription = errorDescMatch[1].trim()
              .replace(/<br\s*\/?>/gi, ' ')
              .replace(/<\/br>/gi, ' ')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          // Fallback to DOM method
          if (!finalError) {
            const errorElement = document.querySelector('error');
            const errorDescElement = document.querySelector('error_description');
            
            if (errorElement) {
              finalError = errorElement.textContent.trim();
            }
            
            if (errorDescElement) {
              finalDescription = errorDescElement.textContent.trim()
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<\/br>/gi, ' ')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }
          }
        } catch (e) {
          console.error('OAuth Doctor: Error parsing XML:', e);
        }
        
        if (!finalError) {
          return null;
        }
      } else {
        const bodyText = document.body.innerText || document.body.textContent || '';
        
        // Try JSON parsing for token endpoint
        if (pathname.includes('/services/oauth2/token')) {
          try {
            const jsonData = JSON.parse(bodyText);
            
            if (jsonData.error) {
              finalError = jsonData.error;
              finalDescription = jsonData.error_description || jsonData.message || '';
              finalUri = jsonData.error_uri || '';
            }
          } catch (e) {
            // Not JSON, try XML
          }
          
          // Try XML parsing
          if (!finalError) {
            try {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(bodyText, 'text/xml');
              const errorElement = xmlDoc.querySelector('error');
              const errorDescElement = xmlDoc.querySelector('error_description');
              
              if (errorElement && !xmlDoc.querySelector('parsererror')) {
                finalError = errorElement.textContent;
                if (errorDescElement) {
                  finalDescription = errorDescElement.textContent;
                }
              }
            } catch (e) {
              // XML parsing failed
            }
          }
        }
      }
      
      // Check HTML content for error patterns
      if (!finalError && document.body) {
        const bodyText = document.body.innerText || document.body.textContent || '';
        
        // Pattern 1: error=xxx&error_description=yyy
        const errorPattern1 = /error=([^&\s]+)(?:&|.*?)error_description=([^&\s]+)/i;
        const match1 = bodyText.match(errorPattern1);
        
        if (match1) {
          finalError = decodeURIComponent(match1[1]);
          finalDescription = decodeURIComponent(match1[2].replace(/\+/g, ' '));
        } else {
          // Pattern 2: error: xxx
          const errorPattern2 = /error[:\s]+([a-z_]+)/i;
          const match2 = bodyText.match(errorPattern2);
          
          if (match2) {
            finalError = match2[1];
            
            const descPattern = /error[_\s]description[:\s]+(.+?)(?:\n|$)/i;
            const descMatch = bodyText.match(descPattern);
            if (descMatch) {
              finalDescription = descMatch[1].trim();
            }
          }
        }
        
        // Pattern 3: Salesforce-specific error messages
        if (!finalError) {
          if (bodyText.includes('redirect_uri') && (bodyText.includes('mismatch') || bodyText.includes('must match'))) {
            finalError = 'redirect_uri_mismatch';
            finalDescription = 'The redirect_uri in the request does not match the configured callback URL';
          } else if (bodyText.includes('invalid_client_id') || (bodyText.includes('client_id') && bodyText.includes('invalid'))) {
            finalError = 'invalid_client_id';
            finalDescription = 'The client_id is invalid or not found';
          } else if (bodyText.includes('unauthorized_client') || bodyText.includes('not authorized')) {
            finalError = 'unauthorized_client';
            finalDescription = 'The client is not authorized to use this authorization flow';
          } else if (bodyText.includes('invalid_grant') || bodyText.includes('authentication failure')) {
            finalError = 'invalid_grant';
            finalDescription = 'Authentication failed or authorization code is invalid';
          } else if (bodyText.includes('invalid_client') || bodyText.includes('client authentication failed')) {
            finalError = 'invalid_client';
            finalDescription = 'Client authentication failed';
          }
        }
      }
    }
    
    if (finalError) {
      // Final cleanup
      finalError = finalError
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/br>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (finalDescription) {
        finalDescription = finalDescription
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/br>/gi, ' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      // Get explanation for this error
      const explanation = ERROR_EXPLANATIONS[finalError] || {
        title: 'OAuth Error',
        description: 'An OAuth authorization error occurred.',
        fix: [
          'Check the error message for details',
          'Review your Connected App configuration',
          'Verify your OAuth flow parameters',
          'Consult Salesforce OAuth documentation'
        ],
        severity: 'error'
      };
      
      return {
        error: finalError,
        description: finalDescription,
        uri: finalUri,
        explanation: explanation
      };
    }
    
    return null;
  }

  // Export to global namespace
  window.OAuthErrorAnalyzer = {
    ERROR_EXPLANATIONS,
    checkForOAuthError
  };

})(window);

