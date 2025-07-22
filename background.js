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
  const settingsUrl = "https://mail.google.com/mail/u/0/#settings/accounts";
  const inboxUrl = "https://mail.google.com/mail/u/0/#inbox";
  
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
            // Navigate back to inbox after refresh
            setTimeout(() => {
              chrome.tabs.update(settingsTabId, { url: inboxUrl });
            }, 1000);
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
      let chromeSettingTab = tabs.find((tab) => tab.url && tab.url.includes(settingsUrl));
      
      if (chromeSettingTab) {
        // Found existing settings tab, save its ID
        settingsTabId = chromeSettingTab.id;
        chrome.tabs.sendMessage(chromeSettingTab.id, { action: "clickButton" })
          .then(response => {
            console.log('[GPAR] Response:', response);
            // Navigate back to inbox after refresh
            setTimeout(() => {
              chrome.tabs.update(chromeSettingTab.id, { url: inboxUrl });
            }, 1000);
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
          chrome.tabs.update(gmailTab.id, { url: settingsUrl, active: false }, () => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === gmailTab.id && info.status === "complete") {
                setTimeout(() => {
                  chrome.tabs.sendMessage(gmailTab.id, { action: "clickButton" })
                    .then(response => {
                      console.log('[GPAR] Response from updated tab:', response);
                      // Navigate back to inbox after refresh
                      setTimeout(() => {
                        chrome.tabs.update(gmailTab.id, { url: inboxUrl });
                      }, 1000);
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
          chrome.tabs.create({ url: settingsUrl, pinned: true }, (tab) => {
            settingsTabId = tab.id;
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === "complete") {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: "clickButton" })
                    .then(response => {
                      console.log('[GPAR] Response from new tab:', response);
                      // Navigate back to inbox after refresh
                      setTimeout(() => {
                        chrome.tabs.update(tab.id, { url: inboxUrl });
                      }, 1000);
                    })
                    .catch(error => {
                      console.log("Error sending message to new tab:", error);
                      setTimeout(() => {
                        chrome.tabs.sendMessage(tab.id, { action: "clickButton" })
                          .then(() => {
                            // Navigate back to inbox after retry
                            setTimeout(() => {
                              chrome.tabs.update(tab.id, { url: inboxUrl });
                            }, 1000);
                          })
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