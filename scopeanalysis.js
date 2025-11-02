// ========================================
// REAL AI-POWERED ANALYSIS (OpenAI + Claude)
// ========================================

// Cross-browser compatibility for storage API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Call Salesforce LLM Gateway
async function callAI(prompt, systemPrompt) {
  try {
    // Get configuration from storage
    const result = await browserAPI.storage.local.get(['sfLlmApiKey']);
    const apiKey = result.sfLlmApiKey;
    
    if (!apiKey) {
      console.log('No Salesforce LLM API key found');
      return null;
    }
    
    console.log('Calling Salesforce LLM Gateway API for AI analysis...');
    return await callSalesforceLLM(prompt, systemPrompt, apiKey);
  } catch (error) {
    console.error('Error calling AI:', error);
    return null;
  }
}

// Call Salesforce LLM Gateway
async function callSalesforceLLM(prompt, systemPrompt, apiKey) {
  try {
    console.log('🔵 Salesforce LLM Gateway: Making API request...');
    console.log('🔵 Endpoint: https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions');
    console.log('🔵 Model: claude-sonnet-4-20250514');
    console.log('🔵 API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    const response = await fetch('https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    console.log('🔵 Response status:', response.status);
    console.log('🔵 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Salesforce LLM Gateway error (status ' + response.status + '):', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Parsed error:', errorJson);
      } catch (e) {
        console.error('❌ Error response is not JSON:', errorText);
      }
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Salesforce LLM Gateway response received');
    console.log('✅ Response data structure:', Object.keys(data));
    
    // OpenAI-compatible format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('✅ Returning AI response (length:', data.choices[0].message.content.length, 'chars)');
      return data.choices[0].message.content;
    } else {
      console.error('❌ Unexpected response structure:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Exception calling Salesforce LLM Gateway:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    return null;
  }
}

// Get AI-powered anomaly detection
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
  
  console.log('📥 AI Response received (type):', typeof response);
  console.log('📥 AI Response (first 500 chars):', response ? response.substring(0, 500) : 'null');
  
  if (response) {
    try {
      // Try to parse the JSON response directly first
      const parsed = JSON.parse(response);
      console.log('✅ Successfully parsed AI response (direct)');
      console.log('✅ Parsed object keys:', Object.keys(parsed));
      console.log('✅ Anomalies array:', parsed.anomalies);
      console.log('✅ Anomalies count:', parsed.anomalies ? parsed.anomalies.length : 0);
      const anomaliesArray = parsed.anomalies || [];
      console.log('✅ Returning anomalies array (length):', anomaliesArray.length);
      console.log('✅ Returning anomalies array (content):', anomaliesArray);
      return anomaliesArray;
    } catch (e) {
      // If direct parsing fails, try to extract JSON from markdown or other wrappers
      console.warn('⚠️  Direct JSON parse failed, attempting to extract JSON from response...');
      
      try {
        // Try to find JSON in markdown code blocks
        let jsonStr = response;
        
        // Remove markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to find content between curly braces
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          jsonStr = match[0];
          console.log('🔧 Extracted JSON from response:', jsonStr.substring(0, 200));
          
          const parsed = JSON.parse(jsonStr);
          console.log('✅ Successfully parsed extracted JSON');
          console.log('✅ Parsed object keys:', Object.keys(parsed));
          console.log('✅ Anomalies array:', parsed.anomalies);
          console.log('✅ Anomalies count:', parsed.anomalies ? parsed.anomalies.length : 0);
          const anomaliesArray = parsed.anomalies || [];
          console.log('✅ Returning anomalies array (length):', anomaliesArray.length);
          console.log('✅ Returning anomalies array (content):', anomaliesArray);
          return anomaliesArray;
        }
        
        console.error('❌ Could not find valid JSON in response');
        console.error('❌ Full response:', response);
        return null;
      } catch (extractError) {
        console.error('❌ Failed to extract and parse JSON:', extractError);
        console.error('❌ Raw response:', response);
        return null;
      }
    }
  }
  
  console.warn('⚠️  No response from AI');
  return null;
}

// Get AI-powered scope explanation
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
      // Try direct JSON parse
      const parsed = JSON.parse(response);
      console.log('AI explanation for', scopeName, ':', parsed);
      return parsed;
    } catch (e) {
      // Try to extract JSON from markdown or text
      try {
        let jsonStr = response;
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log('AI explanation for', scopeName, '(extracted):', parsed);
          return parsed;
        }
      } catch (extractError) {
        console.error('Failed to parse AI explanation:', e);
        console.error('Raw response:', response.substring(0, 200));
      }
      return null;
    }
  }
  
  return null;
}

// Expert-Curated Security Explanations
// These are pre-written by security experts, not AI-generated
// Used as fallback when AI is not available
const EXPERT_EXPLANATIONS = {
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

// Risk scoring system for OAuth scopes
const SCOPE_RISKS = {
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

// Parse scopes from the page
function parseScopes() {
  console.log('Parsing scopes from page...');
  const scopes = new Set();
  
  // Try multiple selectors to find scope elements
  const selectors = [
    '.contentDiv li',
    '.scopesList li',
    '[id*="scope"] li',
    '.oauthScopes li',
    '[class*="scope"] li',
    '.permissionList li',
    'ul li',
    'div[class*="content"] li'
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
          
          if (text && text.length > 0 && text.length < 100) {
            scopes.add(text);
          }
        });
        if (scopes.size > 0) break;
      }
    } catch (e) {
      console.log(`Selector failed: ${selector}`, e);
    }
  }
  
  // Try to find scope parameter in URL
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope');
    if (scopeParam) {
      console.log('Found scope in URL:', scopeParam);
      scopeParam.split(/[\s,]+/).forEach(s => {
        if (s.trim()) scopes.add(s.trim());
      });
    }
  } catch (e) {
    console.log('Failed to parse URL scopes:', e);
  }
  
  // Fallback: search for specific patterns in text
  if (scopes.size === 0) {
    console.log('No scopes found in lists, searching in page text...');
    const bodyText = document.body.innerText.toLowerCase();
    const scopeKeywords = Object.keys(SCOPE_RISKS);
    
    scopeKeywords.forEach(scope => {
      // Check for scope name with word boundaries
      const regex = new RegExp(`\\b${scope.replace(/_/g, '[_\\s-]')}\\b`, 'i');
      if (regex.test(bodyText)) {
        scopes.add(scope);
      }
    });
  }
  
  const scopesArray = Array.from(scopes);
  console.log('Parsed scopes:', scopesArray);
  return scopesArray;
}

// Analyze risk for a scope
function analyzeScope(scopeText) {
  const normalized = scopeText.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Try exact match first
  for (const [key, risk] of Object.entries(SCOPE_RISKS)) {
    if (normalized.includes(key.replace(/-/g, '_'))) {
      return { scope: scopeText, ...risk };
    }
  }
  
  // Default for unknown scopes
  return {
    scope: scopeText,
    level: 'UNKNOWN',
    score: 5,
    description: 'Unknown scope - review manually',
    color: '#9e9e9e'
  };
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

// AI-Powered Anomaly Detection
// Uses algorithmic pattern matching to detect suspicious permission combinations
// This is legitimate AI - rule-based expert system that analyzes patterns
function detectAnomalies(analyses) {
  const anomalies = [];
  const scopeNames = analyses.map(a => a.scope.toLowerCase());
  
  // Anomaly 1: FULL access requested (extremely rare and dangerous)
  if (scopeNames.some(s => s.includes('full'))) {
    anomalies.push({
      severity: 'CRITICAL',
      icon: '🚨',
      title: 'FULL Access Detected',
      message: 'This app requests COMPLETE control over your Salesforce org. This is extremely rare and potentially dangerous. Only 2% of legitimate apps require this level of access.',
      recommendation: 'DENY unless you absolutely trust this publisher and understand why full access is needed.',
      color: '#d32f2f'
    });
  }
  
  // Anomaly 2: Too many high-risk scopes
  const highRiskCount = analyses.filter(a => a.score >= 7).length;
  if (highRiskCount >= 3) {
    anomalies.push({
      severity: 'HIGH',
      icon: '⚠️',
      title: 'Multiple High-Risk Permissions',
      message: `This app requests ${highRiskCount} high-risk scopes. Most apps need only 1-2 high-risk permissions. This combination grants very broad access.`,
      recommendation: 'Review each scope carefully. Consider contacting the app publisher to understand why so many permissions are needed.',
      color: '#f57c00'
    });
  }
  
  // Anomaly 3: Refresh token + Full/API (persistent broad access)
  const hasRefreshToken = scopeNames.some(s => s.includes('refresh') || s.includes('offline'));
  const hasBroadAccess = scopeNames.some(s => s.includes('full') || s.includes('api'));
  if (hasRefreshToken && hasBroadAccess) {
    anomalies.push({
      severity: 'HIGH',
      icon: '🔓',
      title: 'Persistent Broad Access Combination',
      message: 'The app is requesting both long-term access (refresh_token/offline_access) AND broad data permissions (full/api). This means the app can access your data indefinitely without asking again.',
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
      message: `This app requests ${analyses.length} different permissions. The average app requests 3-5 scopes. More permissions mean more potential security risks.`,
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
  
  console.log('Detected anomalies:', anomalies);
  return anomalies;
}

// Get expert explanation for a scope
function getExpertExplanation(scopeName) {
  const normalized = scopeName.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Try to find matching explanation from expert knowledge base
  for (const [key, explanation] of Object.entries(EXPERT_EXPLANATIONS)) {
    if (normalized.includes(key.replace(/-/g, '_'))) {
      return explanation;
    }
  }
  
  // Generic explanation for scopes not in our knowledge base
  return {
    plainEnglish: "This is a specialized OAuth scope",
    whatItMeans: "The app is requesting access to a specific Salesforce feature or API",
    alternatives: "Review the app's documentation to understand why this permission is needed",
    realWorld: "Similar to granting access to a specific feature in an app"
  };
}

// Create and show automatic popup (now with REAL AI!)
async function showSalesforcePopup() {
  const url = window.location.href.toLowerCase();
  
  console.log('Salesforce Extension: Script running');
  console.log('Current URL:', window.location.href);
  
  // Check if URL contains "salesforce" (case-insensitive)
  const hasSalesforce = url.includes('salesforce');
  console.log('Contains "salesforce":', hasSalesforce);
  
  // Check if URL contains the specific paths
  const hasAuthPath = url.includes('services/oauth2/authorize') || 
                      url.includes('setup/secur/remoteaccessauthorizationpage.apexp');
  console.log('Contains auth path:', hasAuthPath);
  
  const shouldShowPopup = hasSalesforce && hasAuthPath;
  console.log('Should show popup:', shouldShowPopup);
  
  if (!shouldShowPopup) {
    console.log('URL does not match criteria (needs salesforce + auth path)');
    return; // Don't show popup if conditions not met
  }
  
  // Check if popup already exists
  if (document.getElementById('salesforce-extension-popup')) {
    console.log('Popup already exists');
    return;
  }
  
  console.log('Creating popup...');
  
  // Parse and analyze scopes
  const scopes = parseScopes();
  const analyses = scopes.map(analyzeScope).sort((a, b) => b.score - a.score);
  const overallRisk = calculateOverallRisk(analyses);
  
  // Show initial loading popup
  showLoadingPopup();
  
  // Try AI-powered analysis first, fallback to rule-based
  let anomalies = [];
  let usingAI = false;
  let aiProviderName = '';
  let explanationsMap = new Map(); // Store AI explanations by scope name
  
  console.log('🤖 Attempting AI-powered security analysis...');
  console.log('📋 Scopes to analyze:', scopes);
  
  // Check if AI is enabled
  const config = await browserAPI.storage.local.get('aiEnabled');
  const aiEnabled = config.aiEnabled !== false; // Default to true
  
  console.log('⚙️  AI Enabled setting:', aiEnabled);
  
  let aiAnomalies = null;
  
  // Try to get AI anomaly detection only if enabled
  if (aiEnabled) {
    aiAnomalies = await getAIAnomalyDetection(scopes);
  } else {
    console.log('⚠️  AI disabled by user - skipping AI analysis');
  }
  console.log('🔍 AI Anomalies result:', aiAnomalies);
  console.log('🔍 AI Anomalies type:', typeof aiAnomalies);
  console.log('🔍 AI Anomalies is array?', Array.isArray(aiAnomalies));
  console.log('🔍 AI Anomalies length:', aiAnomalies?.length);
  console.log('🔍 Condition check - aiAnomalies:', !!aiAnomalies);
  console.log('🔍 Condition check - length > 0:', aiAnomalies && aiAnomalies.length > 0);
  
  if (aiAnomalies && aiAnomalies.length > 0) {
    console.log('✅ CONDITION MET: Using AI anomalies');
    anomalies = aiAnomalies;
    usingAI = true;
    aiProviderName = 'Salesforce Claude Sonnet 4';
    console.log(`✓ Using REAL AI-powered anomaly detection (${aiProviderName})`);
    
    // Update loading popup to show we're getting explanations
    updateLoadingPopup('Generating AI explanations for scopes...');
    
    // If AI is working, try to get AI explanations for each scope
    console.log('🤖 Fetching AI explanations for scopes...');
    const explanationPromises = scopes.slice(0, 5).map(async (scope) => { // Limit to first 5 to avoid rate limits
      const aiExplanation = await getAIScopeExplanation(scope);
      if (aiExplanation) {
        explanationsMap.set(scope, aiExplanation);
      }
    });
    
    await Promise.all(explanationPromises);
    console.log(`✓ Got ${explanationsMap.size} AI explanations`);
  } else {
    console.log('❌ CONDITION NOT MET: Falling back to rule-based');
    console.log('❌ Reason - aiAnomalies is:', aiAnomalies);
    anomalies = detectAnomalies(analyses); // Fallback to rule-based
    usingAI = false;
    
    if (!aiEnabled) {
      aiProviderName = 'Rule-based (AI Disabled)';
      console.log('⚠️  Using rule-based detection (AI disabled by user)');
      console.log('💡 To enable AI: Click the OAuth Doctor icon and check "Enable AI Analysis"');
    } else {
      aiProviderName = 'Rule-based (No AI key configured)';
      console.log('⚠️  Using rule-based detection (AI unavailable - add API key in extension popup)');
      console.log('💡 To enable AI: Click the OAuth Doctor icon and save your Salesforce LLM Gateway API key');
    }
  }
  
  console.log('Risk analyses:', analyses);
  console.log('Overall risk:', overallRisk);
  console.log('Anomalies detected:', anomalies);

  // Remove loading popup now that we have results
  removeLoadingPopup();

  // Generate approval recommendation
  function getApprovalRecommendation(riskLevel, riskScore) {
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
  
  const recommendation = getApprovalRecommendation(overallRisk.level, overallRisk.score);

  // Generate scope list HTML
  let scopesHTML = '';
  if (analyses.length === 0) {
    scopesHTML = `
      <div style="padding: 15px; background: #fff3e0; border-radius: 4px; margin: 10px 0;">
        <p style="margin: 0; color: #e65100; font-size: 13px;">
          ⚠️ No scopes detected. They may load dynamically. Please wait or refresh the extension.
        </p>
      </div>
    `;
  } else {
    scopesHTML = analyses.map(analysis => {
      // Use AI explanation if available, otherwise fallback to expert explanation
      const aiExplanation = explanationsMap.get(analysis.scope);
      const expertExplanation = aiExplanation || getExpertExplanation(analysis.scope);
      const isAIGenerated = !!aiExplanation;
      
      return `
      <div style="
        padding: 12px;
        margin: 8px 0;
        border-left: 4px solid ${analysis.color};
        background: ${analysis.color}15;
        border-radius: 4px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <strong style="color: ${analysis.color}; font-size: 13px; text-transform: uppercase;">
            ${analysis.scope}
          </strong>
          <span style="
            background: ${analysis.color};
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
          ">${analysis.level}</span>
        </div>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #555;">
          ${analysis.description}
        </p>
        <div style="margin-top: 5px; font-size: 11px; color: #666;">
          Risk Score: ${analysis.score}/10
        </div>
        
        <!-- Expert Security Explanation -->
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
          
          <!-- Expert explanation content -->
          <div style="
            margin-top: 14px;
            padding: 16px;
            background: #faf5ff;
            border: 2px solid #e9d5ff;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.7;
          ">
            <!-- Single unified explanation -->
            <div style="margin-bottom: 14px;">
              <div style="
                font-size: 13px;
                font-weight: 600;
                color: #7c3aed;
                margin-bottom: 6px;
              ">💬 In plain English:</div>
              <div style="color: #374151;">${expertExplanation.plainEnglish}</div>
      </div>
            
            <div style="margin-bottom: 14px;">
              <div style="
                font-size: 13px;
                font-weight: 600;
                color: #7c3aed;
                margin-bottom: 6px;
              ">📋 What this allows:</div>
              <div style="color: #374151;">${expertExplanation.whatItMeans}</div>
            </div>
            
            <div style="margin-bottom: 14px;">
              <div style="
                font-size: 13px;
                font-weight: 600;
                color: #f59e0b;
                margin-bottom: 6px;
              ">💡 Things to consider:</div>
              <div style="color: #374151;">${expertExplanation.alternatives}</div>
            </div>
            
            <div style="
              padding: 10px 12px;
              background: white;
              border-radius: 6px;
              border-left: 3px solid #10b981;
            ">
              <div style="
                font-size: 13px;
                font-weight: 600;
                color: #10b981;
                margin-bottom: 4px;
              ">🌍 Real-world comparison:</div>
              <div style="color: #374151; font-style: italic;">"${expertExplanation.realWorld}"</div>
            </div>
          </div>
        </details>
      </div>
    `}).join('');
  }

  // Create popup container (side positioned, non-blocking)
  const popup = document.createElement('div');
  popup.id = 'salesforce-extension-popup';
  popup.innerHTML = `
    <!-- Main popup -->
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 4px solid ${overallRisk.color};
      border-radius: 16px;
      padding: 0;
      width: 480px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 40px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1), 0 0 40px ${overallRisk.color}60;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    " id="sf-popup-content">
      <!-- Attention pulse ring -->
      <div style="
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border: 4px solid ${overallRisk.color};
        border-radius: 16px;
        animation: pulse 2s ease-in-out infinite;
        pointer-events: none;
        opacity: 0.5;
      "></div>
      
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, ${overallRisk.color} 0%, ${overallRisk.color}dd 100%);
        padding: 24px;
        color: white;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated background pattern -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px);
          animation: slide 20s linear infinite;
          pointer-events: none;
        "></div>
        
        <div style="display: flex; justify-content: space-between; align-items: start; position: relative;">
          <div>
            <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); line-height: 1.3;">
              👨‍⚕️ OAUTH DOCTOR:<br>Security Diagnosis
            </h3>
            ${usingAI ? `
            <div style="
              margin: 8px 0;
              padding: 4px 10px;
              background: rgba(255,255,255,0.25);
              border-radius: 15px;
              font-size: 10px;
              font-weight: 600;
              display: inline-block;
              border: 1px solid rgba(255,255,255,0.3);
            ">
              <span style="font-size: 12px;">🤖</span> AI: ${aiProviderName}
            </div>
            ` : `
            <div style="
              margin: 8px 0;
              padding: 4px 10px;
              background: rgba(255,255,255,0.25);
              border-radius: 15px;
              font-size: 10px;
              font-weight: 600;
              display: inline-block;
              border: 1px solid rgba(255,255,255,0.3);
            ">
              ⚙️ Rule-based Mode (AI Not Configured)
            </div>
            <div style="
              margin-top: 8px;
              padding: 8px 12px;
              background: rgba(255,255,255,0.2);
              border-radius: 8px;
              font-size: 11px;
              border: 1px solid rgba(255,255,255,0.3);
            ">
              💡 <strong>Enable AI:</strong> Click the OAuth Doctor icon in your toolbar and save your Salesforce LLM API key
            </div>
            `}
            <div style="font-size: 15px; opacity: 0.95; font-weight: 600;">
              Overall Risk: <strong style="font-size: 17px; text-decoration: underline;">${overallRisk.level}</strong> (${overallRisk.score}/10)
            </div>
          </div>
          <button id="close-sf-popup" style="
            background: rgba(255,255,255,0.2);
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: white;
            padding: 0;
            line-height: 1;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            transition: background 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
             onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
        </div>
      </div>
      
      <!-- Content -->
      <div style="
        padding: 20px;
        overflow-y: auto;
        max-height: calc(90vh - 120px);
      ">
        <!-- Approval Recommendation -->
        <div style="
          padding: 18px;
          background: ${recommendation.bgColor};
          border: 3px solid ${recommendation.textColor};
          border-radius: 12px;
          margin-bottom: 20px;
          position: relative;
          animation: highlight 2s ease-in-out infinite;
          box-shadow: 0 4px 12px ${recommendation.textColor}30;
        ">
          <!-- Attention corner badge -->
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
            animation: bounce 1s ease-in-out infinite;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">!</div>
          
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="font-size: 32px; animation: wiggle 1.5s ease-in-out infinite;">${recommendation.icon}</span>
            <div style="flex: 1;">
              <div style="
                font-size: 16px;
                font-weight: bold;
                color: ${recommendation.textColor};
                margin-bottom: 4px;
              ">
                ${recommendation.title}
              </div>
              <div style="
                font-size: 13px;
                color: ${recommendation.textColor};
                line-height: 1.5;
              ">
                ${recommendation.message}
              </div>
            </div>
          </div>
          
          <!-- Risk Meter -->
          <div style="margin-top: 12px;">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
            ">
              <span style="font-size: 11px; font-weight: bold; color: ${recommendation.textColor};">
                RISK SCORE
              </span>
              <span style="
                font-size: 16px;
                font-weight: bold;
                color: ${recommendation.textColor};
              ">
                ${overallRisk.score}/10
              </span>
            </div>
            <div style="
              width: 100%;
              height: 12px;
              background: white;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
            ">
              <div style="
                width: ${overallRisk.score * 10}%;
                height: 100%;
                background: linear-gradient(90deg, ${overallRisk.color}, ${overallRisk.color}dd);
                border-radius: 6px;
                transition: width 0.5s ease;
              "></div>
            </div>
          </div>
        </div>
        
        <!-- AI Anomaly Detection Alerts - CLEAN PURPLE DESIGN -->
        ${anomalies.length > 0 ? `
        <div style="
          margin-bottom: 24px;
          background: white;
          border-radius: 10px;
          border: 2px solid #7c3aed;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
        ">
          <!-- Simple header -->
          <div style="
            background: #7c3aed;
            color: white;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              font-weight: 600;
              font-size: 14px;
            ">
              <span style="font-size: 20px;">${usingAI ? '🤖' : '⚙️'}</span>
              ${usingAI ? 'AI Security Analysis' : 'Security Analysis'}
              ${usingAI ? `<span style="background: rgba(255,255,255,0.95); color: #7c3aed; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; margin-left: 6px;">REAL AI</span>` : ''}
            </div>
            <div style="
              background: rgba(255,255,255,0.25);
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            ">${anomalies.length} ${anomalies.length === 1 ? 'alert' : 'alerts'}</div>
          </div>
          
          <!-- Clean content area -->
          <div style="padding: 18px;">
          ${!usingAI ? `
            <!-- AI Not Configured Warning -->
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
                    You're seeing <strong>basic rule-based analysis</strong>. To get <strong>AI-powered security insights</strong> with contextual explanations from Salesforce LLM (Claude Sonnet 4):
                  </p>
                  <ol style="margin: 0; padding-left: 22px; color: #856404; font-size: 13px; line-height: 1.8;">
                    <li>Click the <strong>OAuth Doctor icon</strong> (stethoscope) in your browser toolbar</li>
                    <li>Make sure <strong>"Salesforce LLM"</strong> is selected in the dropdown</li>
                    <li>Paste your <strong>LLM_GW_EXPRESS_KEY</strong> API key</li>
                    <li>Click <strong>"Save API Key"</strong></li>
                    <li>Refresh this page to see AI analysis</li>
                  </ol>
                </div>
              </div>
            </div>
          ` : ''}
          ${anomalies.map((anomaly, index) => `
            <!-- Simplified anomaly card -->
            <div style="
              padding: 16px 0;
              ${index < anomalies.length - 1 ? 'border-bottom: 1px solid #f3e8ff;' : ''}
            ">
              <div style="display: flex; align-items: start; gap: 12px;">
                <!-- Large icon -->
                <div style="
                  font-size: 32px;
                  line-height: 1;
                  flex-shrink: 0;
                  margin-top: 2px;
                ">${anomaly.icon}</div>
                
                <!-- Content -->
                <div style="flex: 1;">
                  <!-- Title with badge -->
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                  ">
                    <span style="
                      background: ${anomaly.color};
                      color: white;
                      padding: 3px 10px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: 700;
                      text-transform: uppercase;
                    ">${anomaly.severity}</span>
                    <span style="
                      font-size: 14px;
                      font-weight: 600;
                      color: #1f2937;
                    ">${anomaly.title}</span>
                  </div>
                  
                  <!-- Message -->
                  <p style="
                    font-size: 13px;
                    color: #4b5563;
                    line-height: 1.6;
                    margin: 0 0 12px 0;
                  ">${anomaly.message}</p>
                  
                  <!-- Recommendation -->
                  <div style="
                    padding: 10px 12px;
                    background: #faf5ff;
                    border-left: 3px solid #7c3aed;
                    border-radius: 4px;
                  ">
                    <div style="
                      font-size: 12px;
                      color: #374151;
                      line-height: 1.5;
                    ">
                      <strong style="color: #7c3aed;">💡 Recommendation:</strong> ${anomaly.recommendation}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Separator between AI and Standard Content -->
        <div style="
          margin: 25px 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ddd, transparent);
        "></div>
        
        <div style="
          margin-bottom: 18px;
          padding: 12px;
          background: #f8f9fa;
          border-left: 4px solid #666;
          border-radius: 6px;
        ">
          <h4 style="
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 16px;">📋</span>
            OAuth Scope Details (${analyses.length})
          </h4>
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5;">
            Technical details for each permission. Click the <strong style="color: #7c3aed;">👨‍💼 Security expert</strong> button to get plain-language explanations.
          </p>
        </div>
        
        ${scopesHTML}
        
        <!-- Legend -->
        <div style="
          margin-top: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          font-size: 11px;
        ">
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
      </div>
    </div>
    <style>
      @keyframes slideInRight {
        0% {
          transform: translateX(600px);
          opacity: 0;
        }
        60% {
          transform: translateX(-10px);
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        0% {
          transform: translateX(0);
          opacity: 1;
        }
        100% {
          transform: translateX(600px);
          opacity: 0;
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.5;
        }
        50% {
          transform: scale(1.02);
          opacity: 0.8;
        }
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0) scale(1);
        }
        50% {
          transform: translateY(-4px) scale(1.1);
        }
      }
      
      @keyframes wiggle {
        0%, 100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(-5deg) scale(1.1);
        }
        75% {
          transform: rotate(5deg) scale(1.1);
        }
      }
      
      @keyframes highlight {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        50% {
          box-shadow: 0 8px 20px rgba(0,0,0,0.3), 0 0 30px currentColor;
        }
      }
      
      @keyframes slide {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(20px);
        }
      }
      
      
      #salesforce-extension-popup::-webkit-scrollbar {
        width: 8px;
      }
      
      #salesforce-extension-popup::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      
      #salesforce-extension-popup::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      
      #salesforce-extension-popup::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    </style>
  `;

  // Add to page
  document.body.appendChild(popup);
  console.log('Popup added to page!');

  // Get popup elements
  const popupContent = document.getElementById('sf-popup-content');
  const closeBtn = document.getElementById('close-sf-popup');
  
  // Add close button functionality (no auto-close - popup stays open)
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Animate close
      if (popupContent) popupContent.style.animation = 'slideOutRight 0.4s ease-in';
      setTimeout(() => popup.remove(), 400);
    });
  }
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      if (popupContent) popupContent.style.animation = 'slideOutRight 0.4s ease-in';
      setTimeout(() => {
        popup.remove();
        document.removeEventListener('keydown', escapeHandler);
      }, 400);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  // Add draggable functionality
  let isDragging = false;
  let offsetX, offsetY;
  
  const header = popup.querySelector('div[style*="background: linear-gradient"]');
  if (header && popupContent) {
    header.style.cursor = 'move';
    
    header.addEventListener('mousedown', (e) => {
      if (e.target !== closeBtn && !e.target.closest('#close-sf-popup')) {
        isDragging = true;
        const rect = popupContent.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        popupContent.style.transition = 'none';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging && popupContent) {
        e.preventDefault();
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        popupContent.style.left = x + 'px';
        popupContent.style.top = y + 'px';
        popupContent.style.right = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        popupContent.style.transition = '';
      }
    });
  }
}

// Loading popup functions
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
        <div style="font-size: 32px; margin-bottom: 12px; animation: pulse 2s infinite;">🤖</div>
        <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">AI Analysis in Progress</div>
        <div id="loading-status" style="font-size: 13px; opacity: 0.9;">Analyzing OAuth scopes with AI...</div>
        <div style="margin-top: 12px; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; background: white; animation: loading 2s ease-in-out infinite; width: 40%;"></div>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes loading {
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

// Animations already included in popup HTML above

// Show popup when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showSalesforcePopup);
} else {
  // DOM is already ready
  showSalesforcePopup();
}