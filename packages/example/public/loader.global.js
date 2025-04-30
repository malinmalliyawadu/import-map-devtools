// Import Map Devtools - https://github.com/yourusername/import-map-devtools
"use strict";
var ImportMapDevtools = (() => {
  // src/loader.ts
  var LOCAL_STORAGE_KEY = "import-map-overrides";
  var ORIGINALS_STORAGE_KEY = "import-map-originals";
  function log(...args) {
    console.log("[Import Map Devtools]", ...args);
  }
  function logError(...args) {
    console.error("[Import Map Devtools]", ...args);
  }
  function logWarning(...args) {
    console.warn("[Import Map Devtools]", ...args);
  }
  function logCurrentImportMap() {
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    if (importMaps.length === 0) {
      log("No import maps found in document");
      return;
    }
    log(`Current import map(s) in DOM (${importMaps.length} found):`);
    importMaps.forEach((importMap, index) => {
      try {
        const content = JSON.parse(importMap.textContent || "{}");
        log(`Import map #${index + 1}:`, content);
      } catch (e) {
        logError(
          `Failed to parse import map #${index + 1}:`,
          importMap.textContent
        );
      }
    });
  }
  function getOverrides() {
    try {
      const overrides = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
      );
      if (Object.keys(overrides).length > 0) {
        log("Loaded overrides from localStorage:", overrides);
      }
      return overrides;
    } catch (e) {
      logError("Error retrieving import map overrides from localStorage", e);
      return {};
    }
  }
  function getOriginals() {
    try {
      return JSON.parse(localStorage.getItem(ORIGINALS_STORAGE_KEY) || "{}");
    } catch (e) {
      logError("Error retrieving original import map URLs from localStorage", e);
      return {};
    }
  }
  function saveOriginals(originals) {
    try {
      const existingOriginals = getOriginals();
      const mergedOriginals = { ...existingOriginals, ...originals };
      localStorage.setItem(
        ORIGINALS_STORAGE_KEY,
        JSON.stringify(mergedOriginals)
      );
      log("Saved original import map URLs to localStorage:", mergedOriginals);
    } catch (e) {
      logError("Error saving original import map URLs to localStorage", e);
    }
  }
  function saveOriginalUrls(importMapEl) {
    try {
      let currentMap = JSON.parse(importMapEl.textContent || '{"imports":{}}');
      if (currentMap.imports && Object.keys(currentMap.imports).length > 0) {
        const overrides = getOverrides();
        const originals = {};
        for (const [moduleName, url] of Object.entries(currentMap.imports)) {
          if (!overrides[moduleName]) {
            originals[moduleName] = url;
          }
        }
        if (Object.keys(originals).length > 0) {
          log("Saving original URLs for modules:", Object.keys(originals));
          saveOriginals(originals);
        }
      }
    } catch (error) {
      logError("Error saving original import map URLs:", error);
    }
  }
  function applyOverridesToImportMap(importMapEl) {
    const overrides = getOverrides();
    if (Object.keys(overrides).length === 0) {
      log("No overrides to apply");
      return;
    }
    log("Starting to apply overrides to import map:", importMapEl);
    try {
      log("Import map content before overrides:", importMapEl.textContent);
    } catch (e) {
      logError("Couldn't log import map content:", e);
    }
    try {
      let currentMap;
      try {
        currentMap = JSON.parse(importMapEl.textContent || '{"imports":{}}');
        saveOriginalUrls(importMapEl);
      } catch (error) {
        logError("Invalid import map JSON, creating new one:", error);
        currentMap = { imports: {} };
      }
      if (!currentMap.imports) {
        currentMap.imports = {};
      }
      let changes = 0;
      for (const [moduleName, url] of Object.entries(overrides)) {
        if (currentMap.imports[moduleName] !== url) {
          log(
            `Overriding "${moduleName}" from "${currentMap.imports[moduleName] || "undefined"}" to "${url}"`
          );
          currentMap.imports[moduleName] = url;
          changes++;
        }
      }
      if (changes > 0) {
        const newContent = JSON.stringify(currentMap, null, 2);
        log("Setting new import map content:", newContent);
        importMapEl.textContent = newContent;
        const parent = importMapEl.parentNode;
        if (parent) {
          const newImportMap = document.createElement("script");
          newImportMap.setAttribute("type", "importmap");
          newImportMap.textContent = newContent;
          parent.replaceChild(newImportMap, importMapEl);
          log("Replaced import map in DOM to ensure browser recognizes changes");
        } else {
          logWarning("Couldn't replace import map in DOM, parent node not found");
        }
        log(`Updated import map with ${changes} override(s)`);
        logCurrentImportMap();
      } else {
        log("No changes needed to import map, overrides already applied");
      }
    } catch (error) {
      logError("Error applying import map overrides:", error);
    }
  }
  function createImportMapIfNeeded() {
    const overrides = getOverrides();
    if (Object.keys(overrides).length === 0) {
      return null;
    }
    if (document.querySelector('script[type="importmap"]')) {
      return null;
    }
    log("No import map found in document, creating new one");
    const importMapEl = document.createElement("script");
    importMapEl.setAttribute("type", "importmap");
    const content = JSON.stringify({ imports: overrides }, null, 2);
    importMapEl.textContent = content;
    document.head.insertBefore(importMapEl, document.head.firstChild);
    log("Created new import map with overrides:", content);
    return importMapEl;
  }
  function applyOverridesToAllImportMaps() {
    log("Starting to apply overrides to all import maps");
    logCurrentImportMap();
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    if (importMaps.length === 0) {
      log("No import maps found in document");
      createImportMapIfNeeded();
      return;
    }
    log(`Found ${importMaps.length} import map(s) in document`);
    importMaps.forEach((importMap, index) => {
      log(`Processing import map #${index + 1}`);
      applyOverridesToImportMap(importMap);
    });
    log("Finished applying overrides to all import maps");
    logCurrentImportMap();
  }
  function init() {
    log("Loader initializing...");
    applyOverridesToAllImportMaps();
    log("Setting up MutationObserver to watch for new import maps");
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList")
          continue;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.tagName === "SCRIPT" && el.getAttribute("type") === "importmap") {
              log("New import map detected, applying overrides");
              applyOverridesToImportMap(el);
            }
            const importMaps = el.querySelectorAll('script[type="importmap"]');
            if (importMaps.length > 0) {
              log(`Found ${importMaps.length} import map(s) in added node`);
              importMaps.forEach((importMap) => {
                applyOverridesToImportMap(importMap);
              });
            }
          }
        });
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    window.addEventListener("storage", (event) => {
      if (event.key === LOCAL_STORAGE_KEY) {
        log("Overrides changed in another tab, applying updates");
        applyOverridesToAllImportMaps();
      }
    });
    window.addEventListener("import-map-overrides:change", () => {
      log("Detected change event, re-applying overrides");
      applyOverridesToAllImportMaps();
    });
    window.dispatchEvent(new CustomEvent("import-map-devtools:loader-ready"));
    log("Loader initialization complete");
    setInterval(() => {
      log("Periodic check and reapply of import maps");
      applyOverridesToAllImportMaps();
    }, 5e3);
  }
  init();
})();
//# sourceMappingURL=loader.global.js.map