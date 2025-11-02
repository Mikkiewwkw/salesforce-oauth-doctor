// Popup configuration for API key management (Salesforce LLM only)

// Cross-browser compatibility for storage API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Check for existing configuration on load
document.addEventListener('DOMContentLoaded', async () => {
  const result = await browserAPI.storage.local.get(['sfLlmApiKey', 'aiModel']);
  const apiKey = result.sfLlmApiKey;
  const aiModel = result.aiModel || 'claude-sonnet-4-20250514'; // Default model
  
  const statusDiv = document.getElementById('statusDiv');
  const statusText = document.getElementById('statusText');
  const statusDesc = document.getElementById('statusDesc');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const aiModelSelect = document.getElementById('aiModelSelect');
  
  // Set AI model dropdown
  if (aiModelSelect) {
    aiModelSelect.value = aiModel;
  }
  
  if (apiKey) {
    // API key exists
    statusDiv.className = 'status success';
    statusText.textContent = '✓ AI Ready';
    statusDesc.textContent = `Using ${getModelDisplayName(aiModel)}. API key configured successfully.`;
    apiKeyInput.value = '••••••••' + apiKey.slice(-4);
    apiKeyInput.disabled = true;
  } else {
    // No API key
    statusDiv.className = 'status warning';
    statusText.textContent = '⚠️ AI Not Configured';
    statusDesc.textContent = 'Enter your LLM_GW_EXPRESS_KEY below to enable AI-powered analysis.';
  }
});

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

// Handle AI Model Selection
document.getElementById('aiModelSelect').addEventListener('change', async (e) => {
  const selectedModel = e.target.value;
  await browserAPI.storage.local.set({ aiModel: selectedModel });
  
  console.log('AI Model changed to:', selectedModel);
  
  // Update status description if API key is configured
  const result = await browserAPI.storage.local.get(['sfLlmApiKey']);
  if (result.sfLlmApiKey) {
    const statusDesc = document.getElementById('statusDesc');
    if (statusDesc) {
      statusDesc.textContent = `Using ${getModelDisplayName(selectedModel)}. API key configured successfully.`;
    }
  }
});

// Save button handler
document.getElementById('saveButton').addEventListener('click', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveButton');
  const apiKey = apiKeyInput.value.trim();
  
  // Validate API key format
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  // Salesforce LLM keys can be any format - no strict validation
  console.log('Using Salesforce LLM Gateway - accepting any key format');
  
  // Disable button while saving
  saveButton.disabled = true;
  saveButton.textContent = 'Testing API Key...';
  
  // Test the API key
  const isValid = await testApiKey(apiKey);
  
  if (isValid) {
    // Save the API key
    await browserAPI.storage.local.set({ 
      sfLlmApiKey: apiKey
    });
    
    // Update UI
    showStatus('✓ Salesforce LLM API key saved and verified!', 'success');
    apiKeyInput.value = '••••••••' + apiKey.slice(-4);
    apiKeyInput.disabled = true;
    saveButton.textContent = 'Change API Key';
    saveButton.disabled = false;
    
    // Update status
    const statusDiv = document.getElementById('statusDiv');
    const statusText = document.getElementById('statusText');
    const statusDesc = document.getElementById('statusDesc');
    statusDiv.className = 'status success';
    statusText.textContent = '✓ AI Ready';
    statusDesc.textContent = 'Using Salesforce Claude Sonnet 4. Visit a Salesforce OAuth page to see AI analysis.';
    
    // Change to "Change" mode
    setTimeout(() => {
      saveButton.onclick = enableEdit;
    }, 100);
  } else {
    // Error message already shown by testApiKey function
    saveButton.disabled = false;
    saveButton.textContent = 'Save API Key';
  }
});

// Enable editing of API key
function enableEdit() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveButton');
  
  apiKeyInput.value = '';
  apiKeyInput.disabled = false;
  apiKeyInput.focus();
  saveButton.textContent = 'Save API Key';
  saveButton.onclick = null; // Reset to default handler
}

// Test API key by making a simple request
async function testApiKey(apiKey) {
  try {
    console.log('Testing Salesforce LLM Gateway API key...');
    
    // Test Salesforce LLM Gateway
    const response = await fetch('https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: 'Say hello in 3 words' }
        ],
        max_tokens: 20
      })
    });
    
    console.log('SF LLM test response status:', response.status);
    
    if (response.ok) {
      console.log('✓ Salesforce LLM Gateway API key is valid');
      return true;
    } else if (response.status === 401) {
      console.error('❌ Invalid Salesforce LLM API key (401 Unauthorized)');
      const errorText = await response.text();
      console.error('Error response:', errorText);
      showStatus('Invalid API key. Please check your LLM_GW_EXPRESS_KEY.', 'error');
      return false;
    } else if (response.status === 429) {
      // Rate limited but key is valid
      console.log('⚠️ Rate limited (429) - but key is valid');
      showStatus('⚠️ Rate limited, but key is valid. Saved successfully.', 'success');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Salesforce LLM API error:', response.status, errorText);
      showStatus(`API error (${response.status}). Please try again.`, 'error');
      return false;
    }
  } catch (error) {
    console.error('❌ Network error testing API key:', error);
    showStatus('Network error. Check your connection and try again.', 'error');
    return false;
  }
}

// Show status message
function showStatus(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = 'show ' + type;
  
  // Auto-hide after 5 seconds (except for success messages)
  if (type !== 'success') {
    setTimeout(() => {
      statusMessage.className = '';
    }, 5000);
  }
}
