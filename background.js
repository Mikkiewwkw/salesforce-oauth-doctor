// OAuth Doctor - Background Service Worker

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

