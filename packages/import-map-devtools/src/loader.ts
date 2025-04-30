/**
 * Import Map Devtools Loader
 *
 * This script is designed to be loaded early in the page lifecycle, before import maps
 * are processed by the browser. It applies overrides from localStorage to any import maps
 * in the page, and sets up a MutationObserver to handle dynamically added import maps.
 */

const LOCAL_STORAGE_KEY = "import-map-overrides";
const ORIGINALS_STORAGE_KEY = "import-map-originals";

// Log with a consistent prefix
function log(...args: any[]) {
  console.log("[Import Map Devtools]", ...args);
}

function logError(...args: any[]) {
  console.error("[Import Map Devtools]", ...args);
}

function logWarning(...args: any[]) {
  console.warn("[Import Map Devtools]", ...args);
}

// Log function that shows the current import map in the DOM
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

/**
 * Get all overrides from local storage
 */
function getOverrides(): Record<string, string> {
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

/**
 * Get original import map URLs from local storage
 */
function getOriginals(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ORIGINALS_STORAGE_KEY) || "{}");
  } catch (e) {
    logError("Error retrieving original import map URLs from localStorage", e);
    return {};
  }
}

/**
 * Save original import map URLs to local storage
 */
function saveOriginals(originals: Record<string, string>): void {
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

/**
 * Save original URLs from an import map
 */
function saveOriginalUrls(importMapEl: HTMLScriptElement): void {
  try {
    let currentMap = JSON.parse(importMapEl.textContent || '{"imports":{}}');
    if (currentMap.imports && Object.keys(currentMap.imports).length > 0) {
      const overrides = getOverrides();
      const originals: Record<string, string> = {};

      // Only save URLs that aren't already overridden
      for (const [moduleName, url] of Object.entries(currentMap.imports)) {
        if (!overrides[moduleName]) {
          originals[moduleName] = url as string;
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

/**
 * Get all import maps combined into a single object
 * This merges all import maps in the document
 */
function getCombinedImportMap(): { imports: Record<string, string> } {
  const importMaps = document.querySelectorAll('script[type="importmap"]');
  const combined = { imports: {} as Record<string, string> };

  importMaps.forEach((importMapEl) => {
    try {
      const content = JSON.parse(importMapEl.textContent || '{"imports":{}}');
      if (content.imports) {
        Object.assign(combined.imports, content.imports);
      }
    } catch (e) {
      logError("Error parsing import map while combining:", e);
    }
  });

  return combined;
}

/**
 * Apply overrides to an import map element
 */
function applyOverridesToImportMap(importMapEl: HTMLScriptElement): void {
  const overrides = getOverrides();

  if (Object.keys(overrides).length === 0) {
    log("No overrides to apply");
    return; // No overrides to apply
  }

  log("Starting to apply overrides to import map:", importMapEl);

  // First log the content before changes
  try {
    log("Import map content before overrides:", importMapEl.textContent);
  } catch (e) {
    logError("Couldn't log import map content:", e);
  }

  try {
    // Get the current import map content
    let currentMap;
    try {
      currentMap = JSON.parse(importMapEl.textContent || '{"imports":{}}');

      // Save original URLs before applying overrides
      saveOriginalUrls(importMapEl);
    } catch (error) {
      logError("Invalid import map JSON, creating new one:", error);
      currentMap = { imports: {} };
    }

    // Apply overrides
    if (!currentMap.imports) {
      currentMap.imports = {};
    }

    // Check if we're actually changing anything
    let changes = 0;
    for (const [moduleName, url] of Object.entries(overrides)) {
      if (currentMap.imports[moduleName] !== url) {
        log(
          `Overriding "${moduleName}" from "${
            currentMap.imports[moduleName] || "undefined"
          }" to "${url}"`
        );
        currentMap.imports[moduleName] = url;
        changes++;
      }
    }

    if (changes > 0) {
      // Update the import map element with the new content
      const newContent = JSON.stringify(currentMap, null, 2);
      log("Setting new import map content:", newContent);
      importMapEl.textContent = newContent;

      // Force a re-parse of the import map by removing and re-adding it to the DOM
      const parent = importMapEl.parentNode;
      if (parent) {
        const newImportMap = document.createElement("script");
        newImportMap.setAttribute("type", "importmap");
        newImportMap.textContent = newContent;

        // Replace the old import map with the new one
        parent.replaceChild(newImportMap, importMapEl);
        log("Replaced import map in DOM to ensure browser recognizes changes");
      } else {
        logWarning("Couldn't replace import map in DOM, parent node not found");
      }

      log(`Updated import map with ${changes} override(s)`);

      // Log the full import map after changes to verify
      logCurrentImportMap();
    } else {
      log("No changes needed to import map, overrides already applied");
    }
  } catch (error) {
    logError("Error applying import map overrides:", error);
  }
}

/**
 * Create a merged import map and ensure it's the only one in the document
 */
function createMergedImportMap(): HTMLScriptElement | null {
  const overrides = getOverrides();

  // Get all existing import maps
  const importMaps = document.querySelectorAll('script[type="importmap"]');
  const combinedMap = getCombinedImportMap();

  // Apply overrides to the combined map
  for (const [moduleName, url] of Object.entries(overrides)) {
    combinedMap.imports[moduleName] = url;
  }

  // Create the single merged import map
  const newImportMap = document.createElement("script");
  newImportMap.setAttribute("type", "importmap");
  const content = JSON.stringify(combinedMap, null, 2);
  newImportMap.textContent = content;

  // Remove all existing import maps
  importMaps.forEach((map) => {
    if (map.parentNode) {
      log("Removing existing import map:", map.textContent);
      map.parentNode.removeChild(map);
    }
  });

  // Insert the merged import map
  document.head.insertBefore(newImportMap, document.head.firstChild);
  log("Created merged import map with all modules:", content);

  return newImportMap;
}

/**
 * Apply overrides to all import maps in the document
 */
function applyOverridesToAllImportMaps(): void {
  log("Starting to apply overrides to all import maps");
  logCurrentImportMap();

  const importMaps = document.querySelectorAll('script[type="importmap"]');

  if (importMaps.length === 0) {
    log("No import maps found in document");
    // Create a new import map if needed
    createMergedImportMap();
    return;
  }

  if (importMaps.length > 1) {
    log(`Found ${importMaps.length} import maps - merging them into one`);
    // Merge all import maps into one
    createMergedImportMap();
    return;
  }

  log(`Found 1 import map in document`);
  // Apply overrides to the single import map
  applyOverridesToImportMap(importMaps[0] as HTMLScriptElement);

  log("Finished applying overrides to all import maps");
  logCurrentImportMap();
}

/**
 * Initialize the loader
 */
function init(): void {
  log("Loader initializing...");

  // Apply overrides to existing import maps
  applyOverridesToAllImportMaps();

  // Set up a MutationObserver to watch for new import maps
  log("Setting up MutationObserver to watch for new import maps");
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      let importMapAdded = false;

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;

          // Check if the added node is an import map
          if (
            el.tagName === "SCRIPT" &&
            el.getAttribute("type") === "importmap"
          ) {
            importMapAdded = true;
          }

          // Check for import maps within the added node
          const importMaps = el.querySelectorAll('script[type="importmap"]');
          if (importMaps.length > 0) {
            importMapAdded = true;
          }
        }
      });

      // If any import map was added, merge them all
      if (importMapAdded) {
        log("New import map detected, merging all import maps");
        setTimeout(() => applyOverridesToAllImportMaps(), 0);
      }
    }
  });

  // Observe changes to the document
  observer.observe(document, { childList: true, subtree: true });

  // Listen for storage events to update when overrides change in other tabs
  window.addEventListener("storage", (event) => {
    if (event.key === LOCAL_STORAGE_KEY) {
      log("Overrides changed in another tab, applying updates");
      applyOverridesToAllImportMaps();
    }
  });

  // Listen for custom events from the import-map-devtools library
  window.addEventListener("import-map-overrides:change", () => {
    log("Detected change event, re-applying overrides");
    applyOverridesToAllImportMaps();
  });

  // Create a custom event for the main library to know the loader is active
  window.dispatchEvent(new CustomEvent("import-map-devtools:loader-ready"));

  log("Loader initialization complete");

  // Periodically check and reapply import maps in case things change
  setInterval(() => {
    log("Periodic check and reapply of import maps");
    applyOverridesToAllImportMaps();
  }, 5000);
}

// Run the initialization
init();
