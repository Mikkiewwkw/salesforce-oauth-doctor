// OAuth Doctor - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  const docsBtn = document.getElementById('docs-btn');
  const statusDiv = document.getElementById('status');

  // Check extension status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response && response.active) {
      statusDiv.textContent = '✓ Extension Active';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = '⚠ Extension Inactive';
      statusDiv.className = 'status inactive';
    }
  });

  // Analyze current page
  analyzeBtn.addEventListener('click', () => {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'analyze' }, (response) => {
          setTimeout(() => {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<span>🔬</span><span>Analyze Current Page</span>';
            
            if (chrome.runtime.lastError || !response) {
              alert('Could not analyze this page. Make sure you are on a Salesforce OAuth page.');
            } else {
              // Close popup after triggering analysis
              window.close();
            }
          }, 500);
        });
      }
    });
  });

  // Open Salesforce OAuth documentation
  docsBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_authenticate.htm'
    });
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      analyzeBtn.click();
    }
  });
});

