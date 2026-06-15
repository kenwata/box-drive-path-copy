// Box Drive root path settings (fixed per-OS defaults).
// Shared file loaded by popup.js.
// The root (mount location) and path separator are chosen based on the host OS
// (the `os` value from chrome.runtime.getPlatformInfo).
//
// To support a non-standard mount location, edit the root values below before loading
// the extension (e.g. older macOS Box Drive uses "~/Box/").

const BOX_PATH_DEFAULTS = Object.freeze({
  // Windows: path with an environment variable that Explorer expands in the address bar
  win: Object.freeze({ root: "%USERPROFILE%\\Box\\", sep: "\\" }),
  // macOS: mount location of Box Drive 2021+ (FileProvider based)
  mac: Object.freeze({ root: "~/Library/CloudStorage/Box-Box/", sep: "/" }),
});

// Map the `os` value of chrome.runtime.getPlatformInfo() to a settings key.
// Box Drive has no official Linux client, so linux / cros / unknown OSes
// fall back to the win settings.
function osToConfigKey(os) {
  if (os === "mac") return "mac";
  return "win";
}

// Return the { root, sep } actually used for the given OS.
// Return a fresh copy so callers cannot mutate the shared defaults.
function resolveBoxPathConfig(os) {
  return { ...BOX_PATH_DEFAULTS[osToConfigKey(os)] };
}
