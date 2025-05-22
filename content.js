// Signal that content script is ready
let contentScriptReady = false;

// Wait for document to be fully loaded
if (document.readyState === "complete") {
    contentScriptReady = true;
    console.log('[GPAR] Content script ready');
} else {
    window.addEventListener('load', () => {
        contentScriptReady = true;
        console.log('[GPAR] Content script ready');
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "clickButton") {
        console.log('[GPAR] Message received');
        
        try {
            let e = document.getElementsByClassName("rP sA");
            if (e.length > 0) {
                for (let o of e) {
                    o.click();
                }
                console.log('[GPAR] Refresh Pop - Buttons clicked: ' + e.length);
                sendResponse({success: true, count: e.length});
            } else {
                console.log('[GPAR] No refresh buttons found');
                sendResponse({success: false, error: "No refresh buttons found"});
            }
        } catch (error) {
            console.error('[GPAR] Error:', error);
            sendResponse({success: false, error: error.toString()});
        }
        
        return true; // Indicates we'll send a response asynchronously
    }
});
