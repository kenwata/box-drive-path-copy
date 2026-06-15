chrome.runtime.onInstalled.addListener(async () => {
  await updateAllTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateAllTabs();
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // The tab can be closed/discarded right after activation, in which case
  // chrome.tabs.get rejects with "No tab with id". Ignore that race.
  let tab;
  try {
    tab = await chrome.tabs.get(activeInfo.tabId);
  } catch {
    return;
  }
  await updateAction(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    await updateAction(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async () => {
  await updateCurrentTab();
});

async function updateCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tab) {
    await updateAction(tab);
  }
}

async function updateAllTabs() {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    await updateAction(tab);
  }
}

async function updateAction(tab) {
  if (!tab?.id) return;

  // Updating the action targets a specific tab; if that tab is closed while
  // these calls are in flight, the chrome.action APIs reject with
  // "No tab with id". These updates are best-effort UI, so swallow that race.
  try {
    if (isBoxUrl(tab.url)) {
      await chrome.action.enable(tab.id);

      await chrome.action.setIcon({
        tabId: tab.id,
        path: {
          "16": "icons/icon16.png",
          "32": "icons/icon32.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      });

      await chrome.action.setTitle({
        tabId: tab.id,
        title: "Copy Box Drive path"
      });
    } else {
      await chrome.action.disable(tab.id);

      await chrome.action.setIcon({
        tabId: tab.id,
        path: {
          "16": "icons/icon16_gray.png",
          "32": "icons/icon32_gray.png",
          "48": "icons/icon48_gray.png",
          "128": "icons/icon128_gray.png"
        }
      });

      await chrome.action.setTitle({
        tabId: tab.id,
        title: "Available only on Box pages"
      });
    }
  } catch {
    // Tab no longer exists — nothing to update.
  }
}

function isBoxUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "box.com" || hostname.endsWith(".box.com");
  } catch {
    return false;
  }
}
