// OAuth Doctor - Background Service Worker

// LLM API Configuration
const LLM_CONFIG = {
  apiKey: 'sk-XiT2ygqP_1hcIotKVP_RuA',
  endpoint: 'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions',
  model: 'claude-sonnet-4-20250514'
};

// Salesforce OAuth Error Documentation Context
const SALESFORCE_OAUTH_DOC = `
Reference: Salesforce OAuth Error Flow Documentation
(https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_oauth_flow_errors.htm)

Common OAuth errors and their meanings:
- redirect_uri_mismatch: The redirect URI in the authorization request doesn't match the Callback URL in the Connected App
- invalid_client_id: The consumer key (client_id) is invalid or the Connected App doesn't exist
- invalid_client: Client authentication failed, often due to invalid consumer secret
- invalid_grant: Authorization code expired (15 min), already used, or user credentials changed
- access_denied: User denied authorization or admin blocked the Connected App
- invalid_scope: Requested scope is invalid, unknown, or not enabled in Connected App
- unauthorized_client: Connected App not authorized for this grant type
- unsupported_response_type: The response_type parameter is not supported
`;

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('OAuth Doctor installed successfully!');
  } else if (details.reason === 'update') {
    console.log('OAuth Doctor updated to version', chrome.runtime.getManifest().version);
  }
});

// Listen for tab updates to detect OAuth flows
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL contains OAuth-related patterns
    const isOAuthUrl = 
      tab.url.includes('/services/oauth2/authorize') ||
      tab.url.includes('oauth2/authorize') ||
      tab.url.includes('error=') ||
      tab.url.includes('RemoteAccessAuthorizationPage');
    
    if (isOAuthUrl) {
      console.log('OAuth flow detected on tab', tabId);
      
      // Send message to content script to analyze
      chrome.tabs.sendMessage(tabId, { action: 'analyze' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Could not send message:', chrome.runtime.lastError.message);
        }
      });
    }
  }
});

// AI-Powered Error Analysis
async function analyzeErrorWithAI(errorCode, errorDescription, existingExplanation, model) {
  console.log('OAuth Doctor: Requesting AI analysis for error:', errorCode, 'with model:', model);
  
  const prompt = `You are a Salesforce OAuth expert helping developers troubleshoot authorization errors.

${SALESFORCE_OAUTH_DOC}

ERROR DETAILS:
- Error Code: ${errorCode}
- Error Description: ${errorDescription || 'Not provided'}

CURRENT EXPLANATION:
${JSON.stringify(existingExplanation, null, 2)}

TASK:
Provide a concise, actionable response (max 200 words) that:
1. Confirms what the error means
2. Lists the top 3 most likely causes for this specific error
3. Provides clear step-by-step fix instructions
4. Mentions any Salesforce-specific gotchas or common mistakes

Format as plain text, be direct and helpful. Focus on practical solutions.`;

  try {
    // Adjust parameters based on model
    const selectedModel = model || LLM_CONFIG.model;
    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'You are a Salesforce OAuth expert. Provide concise, actionable troubleshooting advice for developers.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500
    };
    
    // GPT-5 only supports temperature=1, omit for compatibility
    // Other models work fine with temperature=0.3
    if (!selectedModel.startsWith('gpt-5')) {
      requestBody.temperature = 0.3;
    }
    
    const response = await fetch(LLM_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OAuth Doctor: API response received:', data);
    
    // Validate response structure
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response structure: missing choices array');
    }
    
    const aiResponse = data.choices[0].message?.content;
    
    // Check for empty response
    if (!aiResponse || aiResponse.trim() === '') {
      throw new Error('Model returned empty response. The model may not support this request or hit a content filter.');
    }
    
    console.log('OAuth Doctor: AI analysis received, length:', aiResponse.length);
    return {
      success: true,
      analysis: aiResponse,
      timestamp: new Date().toISOString(),
      model: model || LLM_CONFIG.model
    };
  } catch (error) {
    console.error('OAuth Doctor: AI analysis failed', error);
    return {
      success: false,
      error: error.message,
      fallback: 'AI analysis temporarily unavailable. Using built-in guidance.'
    };
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ 
      active: true,
      version: chrome.runtime.getManifest().version
    });
  }
  
  if (request.action === 'analyzeCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'analyze' }, (response) => {
          sendResponse(response || { success: false });
        });
      }
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getAIAnalysis') {
    // Handle AI analysis request with selected model
    analyzeErrorWithAI(
      request.errorCode,
      request.errorDescription,
      request.existingExplanation,
      request.model
    ).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      });
    });
    return true; // Keep channel open for async response
  }
  
  return true;
});

// Store OAuth analysis data
let oauthAnalysisCache = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'storeAnalysis') {
    const tabId = sender.tab?.id;
    if (tabId) {
      oauthAnalysisCache[tabId] = {
        timestamp: Date.now(),
        data: request.data
      };
      sendResponse({ success: true });
    }
  }
  
  if (request.action === 'getAnalysis') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const analysis = oauthAnalysisCache[tabs[0].id];
        sendResponse(analysis || null);
      }
    });
    return true;
  }
});

// Clean up old cache entries
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  Object.keys(oauthAnalysisCache).forEach(tabId => {
    if (now - oauthAnalysisCache[tabId].timestamp > maxAge) {
      delete oauthAnalysisCache[tabId];
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes

