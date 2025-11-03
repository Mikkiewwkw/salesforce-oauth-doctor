// OAuth Doctor - Utility Functions
// Common utilities shared between scope and error analysis

// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

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
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/br>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if current page is a Salesforce OAuth page
function isOAuthAuthorizationPage() {
  const url = window.location.href.toLowerCase();
  
  // Check for Salesforce OAuth authorization URLs
  if (url.includes('salesforce') && 
      (url.includes('services/oauth2/authorize') || 
       url.includes('services/oauth2/token') ||
       url.includes('setup/secur/remoteaccessauthorizationpage.apexp'))) {
    return true;
  }
  
  // Additional check: Look for OAuth-related elements on the page
  const hasOAuthElements = (
    document.querySelector('[action*="oauth"]') !== null ||
    document.querySelector('[href*="oauth"]') !== null ||
    document.body.innerText.toLowerCase().includes('oauth')
  );
  
  if (url.includes('salesforce') && hasOAuthElements) {
    return true;
  }
  
  return hasOAuthElements;
}

// Call AI via background script
async function callAI(prompt, systemPrompt, specificModel = null) {
  try {
    const result = await browserAPI.storage.local.get(['sfLlmApiKey', 'aiModel']);
    const apiKey = result.sfLlmApiKey;
    const selectedModel = specificModel || result.aiModel || 'claude-sonnet-4-20250514';
    
    if (!apiKey) {
      return null;
    }
    
    return new Promise((resolve) => {
      browserAPI.runtime.sendMessage({
        action: 'callAI',
        prompt,
        systemPrompt,
        apiKey,
        model: selectedModel
      }, (response) => {
        if (response && response.success) {
          resolve(response.result);
        } else {
          console.error('AI call failed:', response?.error);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error calling AI:', error);
    return null;
  }
}

// Get display name for AI model
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
  return modelNames[modelId] || 'AI Model';
}

// Close overlay with animation
function closeOverlay(overlay) {
  overlay.style.animation = 'oauth-doctor-fadeOut 0.3s ease-out';
  setTimeout(() => overlay.remove(), 300);
}

// Loading popup functions
function showLoadingPopup() {
  if (document.getElementById('oauth-doctor-loading')) return;
  
  const loadingHTML = `
    <div id="oauth-doctor-loading" style="position: fixed; top: 20px; right: 20px; width: 320px; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4); z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px; animation: pulse-loading 2s infinite;">🤖</div>
        <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">AI Analysis in Progress</div>
        <div id="loading-status" style="font-size: 13px; opacity: 0.9;">Analyzing OAuth data...</div>
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

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    browserAPI,
    escapeHtml,
    stripAllHtml,
    isOAuthAuthorizationPage,
    callAI,
    getModelDisplayName,
    closeOverlay,
    showLoadingPopup,
    updateLoadingPopup,
    removeLoadingPopup
  };
}

