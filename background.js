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
        chrome.tabs.sendMessage(settingsTabId, { action: "clickButton" });
      }
    });
  } else {
    createOrFindTab();
  }
  
  function createOrFindTab() {
    // Query only for tabs that might match our URL
    chrome.tabs.query({url: "*mail.google.com*"}, (tabs) => {
      const chromeSettingTab = tabs.find((tab) => tab.url && tab.url.includes(url));
      
      if (chromeSettingTab) {
        // Found existing tab, save its ID
        settingsTabId = chromeSettingTab.id;
        chrome.tabs.sendMessage(chromeSettingTab.id, { action: "clickButton" });
      } else {
        // Only create a new tab if we don't have ANY matching tabs
        chrome.tabs.create({ url, pinned: true }, (tab) => {
          settingsTabId = tab.id;
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === "complete") {
              chrome.tabs.sendMessage(tab.id, { action: "clickButton" });
              chrome.tabs.onUpdated.removeListener(listener);
            }
          });
        });
      }
    });
  }
}