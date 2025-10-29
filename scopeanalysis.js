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

// Create and show automatic popup
function showSalesforcePopup() {
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
  
  console.log('Risk analyses:', analyses);
  console.log('Overall risk:', overallRisk);

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
    scopesHTML = analyses.map(analysis => `
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
      </div>
    `).join('');
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
        
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333; text-transform: uppercase; letter-spacing: 0.5px;">
            Requested Permissions (${analyses.length})
          </h4>
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5;">
            This application is requesting the following OAuth scopes. Review carefully before approving.
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

// Animations already included in popup HTML above

// Show popup when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showSalesforcePopup);
} else {
  // DOM is already ready
  showSalesforcePopup();
}