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
    // Query for Gmail tabs
    chrome.tabs.query({url: "*://mail.google.com/*"}, (tabs) => {
      // First check if we have a tab already on the settings page
      let chromeSettingTab = tabs.find((tab) => tab.url && tab.url.includes(url));
      
      if (chromeSettingTab) {
        // Found existing settings tab, save its ID
        settingsTabId = chromeSettingTab.id;
        chrome.tabs.sendMessage(chromeSettingTab.id, { action: "clickButton" })
          .then(response => {
            console.log('[GPAR] Response:', response);
          })
          .catch(error => {
            console.log("Error sending message to tab:", error);
            chrome.tabs.reload(chromeSettingTab.id);
          });
      } else {
        // Check for any Gmail tab we can navigate to settings
        let gmailTab = tabs.find((tab) => tab.url && tab.url.includes("mail.google.com"));
        
        if (gmailTab) {
          // Navigate existing Gmail tab to settings
          settingsTabId = gmailTab.id;
          chrome.tabs.update(gmailTab.id, { url: url, active: false }, () => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === gmailTab.id && info.status === "complete") {
                setTimeout(() => {
                  chrome.tabs.sendMessage(gmailTab.id, { action: "clickButton" })
                    .then(response => {
                      console.log('[GPAR] Response from updated tab:', response);
                    })
                    .catch(error => {
                      console.log("Error sending message to updated tab:", error);
                    });
                }, 2000);
                chrome.tabs.onUpdated.removeListener(listener);
              }
            });
          });
        } else {
          // Create new pinned tab only if no Gmail tabs exist
          chrome.tabs.create({ url, pinned: true }, (tab) => {
            settingsTabId = tab.id;
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === "complete") {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: "clickButton" })
                    .then(response => {
                      console.log('[GPAR] Response from new tab:', response);
                    })
                    .catch(error => {
                      console.log("Error sending message to new tab:", error);
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
      }
    });
  }
}