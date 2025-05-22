chrome.alarms.create("GPARAlarm", { periodInMinutes: 1 });

// Track if we already have a tab open
let settingsTabId = null;

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "GPARAlarm") {
    execute();
  }
});

// Initial execution
execute();

function execute() {
  const url = "https://mail.google.com/mail/u/0/#settings/accounts";
  
  // First check if we already have a settings tab tracked
  if (settingsTabId !== null) {
    chrome.tabs.get(settingsTabId, function(tab) {
      if (chrome.runtime.lastError) {
        // Tab no longer exists, reset tracking and look for existing tabs
        settingsTabId = null;
        createOrFindTab();
      } else {
        // Tab exists, send message
        chrome.tabs.sendMessage(settingsTabId, { action: "clickButton" })
          .then(response => {
            console.log('[GPAR] Response:', response);
          })
          .catch(error => {
            console.log("Error sending message to tab:", error);
            // If we can't communicate with the tab, reset and try again
            settingsTabId = null;
            createOrFindTab();
          });
      }
    });
  } else {
    createOrFindTab();
  }
  
  function createOrFindTab() {
    // Query only for tabs that might match our URL
    chrome.tabs.query({url: "*://mail.google.com/*"}, (tabs) => {
      const chromeSettingTab = tabs && tabs.length ? tabs.find((tab) => tab.url && tab.url.includes(url)) : null;
      
      if (chromeSettingTab) {
        // Found existing tab, save its ID
        settingsTabId = chromeSettingTab.id;
        chrome.tabs.sendMessage(chromeSettingTab.id, { action: "clickButton" })
          .then(response => {
            console.log('[GPAR] Response:', response);
          })
          .catch(error => {
            console.log("Error sending message to tab:", error);
            // If message fails, try reloading the tab
            chrome.tabs.reload(chromeSettingTab.id);
          });
      } else {
        // Only create a new tab if we don't have ANY matching tabs
        chrome.tabs.create({ url, pinned: true }, (tab) => {
          settingsTabId = tab.id;
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === "complete") {
              // Add a longer delay to ensure content script is fully loaded
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "clickButton" })
                  .then(response => {
                    console.log('[GPAR] Response from new tab:', response);
                  })
                  .catch(error => {
                    console.log("Error sending message to new tab:", error);
                    // Try again with a longer delay
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tab.id, { action: "clickButton" })
                        .catch(e => console.log("Second attempt failed:", e));
                    }, 3000);
                  });
              }, 2000);
              chrome.tabs.onUpdated.removeListener(listener);
            }
          });
        });
      }
    });
  }
}