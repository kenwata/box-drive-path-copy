// Auto-close the popup this many milliseconds after showing the result.
const POPUP_CLOSE_DELAY_MS = 3000;

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const pathEl = document.getElementById("path");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id || !tab?.url) {
      throw new Error("Active tab not found.");
    }

    if (!isBoxUrl(tab.url)) {
      throw new Error("This page does not look like a Box page.");
    }

    // Detect the host OS and pick the matching Box Drive root + path separator.
    const platform = await chrome.runtime.getPlatformInfo();
    const { root, sep } = resolveBoxPathConfig(platform.os);

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getBoxDrivePathFromPage,
      args: [tab.url, root, sep]
    });

    const data = result?.result;

    if (!data?.ok) {
      throw new Error(data?.error || "Failed to get Box path.");
    }

    await navigator.clipboard.writeText(data.path);

    statusEl.textContent = "Copied to clipboard.";
    statusEl.classList.add("success");
    pathEl.textContent = data.path;
  } catch (error) {
    statusEl.textContent = "Failed.";
    statusEl.classList.add("error");
    pathEl.textContent = String(error?.message || error);
  } finally {
    setTimeout(() => {
      window.close();
    }, POPUP_CLOSE_DELAY_MS);
  }
});

function isBoxUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "box.com" || hostname.endsWith(".box.com");
  } catch {
    return false;
  }
}

async function getBoxDrivePathFromPage(pageUrl, ROOT, SEP) {
  const FLYOUT_WAIT_MS = 500;
  const IS_WINDOWS = SEP === "\\";
  // The Box root folder ("My Files") always has ID "0", regardless of language.
  const ROOT_FOLDER_ID = "0";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Extract the Box folder ID from a URL string. e.g. ".../folder/123456" -> "123456".
  // The Box root folder ("My Files") always has ID "0", regardless of language.
  const getFolderIdFromUrl = (url) => {
    const match = String(url || "").match(/\/folder\/(\d+)/);
    return match ? match[1] : null;
  };

  // Extract the Box folder ID from a folder element (the <a> itself or a descendant <a>).
  const getFolderId = (el) => {
    if (!el) return null;

    const anchor =
      el.matches && el.matches("a[href]")
        ? el
        : el.querySelector && el.querySelector("a[href]");

    return getFolderIdFromUrl(anchor?.getAttribute("href") || anchor?.href || "");
  };

  // Language-independent root check: folder ID "0" means the root.
  const isRootElement = (el) => getFolderId(el) === ROOT_FOLDER_ID;

  const normalizePart = (value) => {
    return (value || "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Strip characters that could break the generated path from each part (folder/file name).
  // Box-derived text is not fully trusted, so this is applied consistently to every part,
  // not just the file name part.
  // - Remove path separators (\ /), Windows-illegal characters, and control characters
  // - On Windows, remove % since Explorer expands %VAR% as an environment variable
  // - Drop parts that are only "." or ".." to prevent directory traversal
  const sanitizePart = (value) => {
    let v = normalizePart(value);
    if (!v) return "";

    v = v.replace(/[\\/:*?"<>|\x00-\x1f]/g, "");

    if (IS_WINDOWS) {
      v = v.replace(/%/g, "");
    }

    v = v.trim();

    if (v === "." || v === "..") return "";

    return v;
  };

  const getText = (el) => {
    if (!el) return "";

    return normalizePart(
      el.innerText ||
      el.textContent ||
      el.getAttribute("aria-label") ||
      ""
    );
  };

  const compactConsecutiveDuplicateSequence = (parts) => {
    const result = [...parts];
    let changed = true;

    while (changed) {
      changed = false;

      outer:
      for (let start = 0; start < result.length; start++) {
        const maxLen = Math.floor((result.length - start) / 2);

        for (let len = maxLen; len >= 1; len--) {
          const first = result.slice(start, start + len);
          const second = result.slice(start + len, start + len * 2);

          const same =
            first.length === second.length &&
            first.every((value, index) => value === second[index]);

          if (same) {
            result.splice(start + len, len);
            changed = true;
            break outer;
          }
        }
      }
    }

    return result;
  };

  const isLikelyFilePreviewPage = (url) => {
    try {
      const u = new URL(url || location.href);
      const path = u.pathname;

      // Typical Box file preview URL:
      // https://xxx.box.com/file/1234567890
      if (/\/file\/\d+/.test(path)) return true;

      // Also loosely handle variants such as shared-link URLs, just in case
      if (/\/s\/[^/]+\/file\/\d+/.test(path)) return true;

      return false;
    } catch {
      return false;
    }
  };

  const looksLikeFileName = (value) => {
    const v = normalizePart(value);
    if (!v) return false;

    // e.g. A.pptx, B.pdf, C.png, "日本語ファイル名.xlsx" (non-ASCII names allowed)
    return /\.[A-Za-z0-9]{1,10}$/.test(v);
  };

  const cleanFileNameCandidate = (value) => {
    let v = normalizePart(value);

    // Handle cases where document.title is like "hoge.pptx | Box" / "hoge.pptx - Box"
    v = v.replace(/\s*\|\s*Box\s*$/i, "");
    v = v.replace(/\s*[-–—]\s*Box\s*$/i, "");

    // Drop characters that are invalid in a Windows path from the file-name candidate.
    // Normal Box file names are not expected to contain them.
    const match = v.match(/[^\\/:*?"<>|\r\n]+\.[A-Za-z0-9]{1,10}/);

    if (match) {
      return normalizePart(match[0]);
    }

    return v;
  };

  const getPreviewFileName = () => {
    // Important:
    // Folder pages also contain a file list, so avoid [data-resin-target='openfile']
    // and generic h1 selectors. First decide whether the current page is /file/{id}.
    if (!isLikelyFilePreviewPage(pageUrl)) {
      return "";
    }

    const titleCandidate = cleanFileNameCandidate(document.title);

    if (looksLikeFileName(titleCandidate)) {
      return titleCandidate;
    }

    const metaOgTitle = document.querySelector("meta[property='og:title']");
    const ogTitleCandidate = cleanFileNameCandidate(
      metaOgTitle?.getAttribute("content") || ""
    );

    if (looksLikeFileName(ogTitleCandidate)) {
      return ogTitleCandidate;
    }

    const selectors = [
      "[data-testid='preview-header-title']",
      "[data-testid='file-title']",
      "[data-testid='item-title']",
      ".PreviewHeader-title",
      ".PreviewHeader-titleText"
    ];

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));

      for (const el of elements) {
        const cleaned = cleanFileNameCandidate(getText(el));

        if (looksLikeFileName(cleaned)) {
          return cleaned;
        }
      }
    }

    return "";
  };

  try {
    const parts = [];

    // 1. Click the FolderTreeButton to reveal the truncated (collapsed) hierarchy
    const dotButton = document.querySelectorAll(".FolderTreeButton")[0];

    if (dotButton) {
      dotButton.click();

      await sleep(FLYOUT_WAIT_MS);

      const flyoutParts = [
        ...document.querySelectorAll("a[data-resin-target='openfolder'].menu-item")
      ]
        .filter((el) => !isRootElement(el)) // exclude the root (language-independent)
        .map((el) => sanitizePart(getText(el))) // strip path-breaking characters
        .filter(Boolean); // drop empties

      parts.push(...flyoutParts);
    }

    // 2. Collect the currently visible breadcrumb.
    // The current (last) item has no folder link, so structural detection cannot flag it
    // as the root. When the page itself is the Box root (folder 0), drop that item.
    const onRootPage = getFolderIdFromUrl(pageUrl) === ROOT_FOLDER_ID;

    const breadcrumbEls = [
      ...document.querySelectorAll(".ItemListBreadcrumb-listItem:not(.is-last)"),
      ...(onRootPage
        ? []
        : document.querySelectorAll(".ItemListBreadcrumb-currentItemTitleAndFolderTreeFlyout"))
    ];

    const breadcrumbParts = breadcrumbEls
      .filter((el) => !isRootElement(el)) // exclude the root (language-independent)
      .map((el) => sanitizePart(getText(el.firstElementChild || el))) // strip path-breaking characters
      .filter(Boolean); // drop empties

    parts.push(...breadcrumbParts);

    // 3. Compact duplicates shared between the flyout and the breadcrumb
    const compactedParts = compactConsecutiveDuplicateSequence(parts);

    if (compactedParts.length === 0) {
      // On the Box root ("My Files", folder 0) there are no folder parts.
      // The correct local path is simply the Box Drive mount root itself.
      if (onRootPage) {
        return { ok: true, path: ROOT };
      }

      return {
        ok: false,
        error: "Could not build Box path. Folder elements were not found."
      };
    }

    // 4. Append the file name at the end only on a file preview page
    const fileName = sanitizePart(getPreviewFileName());

    if (fileName && compactedParts[compactedParts.length - 1] !== fileName) {
      compactedParts.push(fileName);
    }

    const path = ROOT + compactedParts.join(SEP);

    document.body.click();

    return {
      ok: true,
      path
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error)
    };
  }
}