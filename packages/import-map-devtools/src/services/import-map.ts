const LOCAL_STORAGE_KEY = "import-map-overrides";
const ORIGINALS_STORAGE_KEY = "import-map-originals";

export interface ImportMapModule {
  moduleName: string;
  originalUrl: string;
  overrideUrl: string | null;
}

export class ImportMapService {
  private loaderReady: boolean;

  constructor() {
    this.loaderReady = false;

    // Check if the loader event has already been dispatched
    this.checkLoaderStatus();

    // Listen for the loader to be ready
    window.addEventListener("import-map-devtools:loader-ready", () => {
      console.log("[Import Map Devtools] Detected loader is active");
      this.loaderReady = true;
    });
  }

  private checkLoaderStatus() {
    // We can't directly check if the loader is already initialized,
    // but we can check if its effects are visible
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    if (importMaps.length > 0) {
      // Check if any import map has overrides applied
      const overrides = this.getOverrides();
      for (const importMap of importMaps) {
        try {
          const map = JSON.parse(importMap.textContent || "{}");
          if (map.imports) {
            for (const [moduleName, url] of Object.entries(overrides)) {
              if (map.imports[moduleName] === url) {
                this.loaderReady = true;
                console.log(
                  "[Import Map Devtools] Loader appears to be active (overrides detected)"
                );
                return;
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }

  /**
   * Get the current import map from the DOM
   */
  getBaseImportMap(): Record<string, string> {
    // First try to get original URLs from localStorage
    const originals = this.getOriginalUrls();
    if (Object.keys(originals).length > 0) {
      console.log(
        "[Import Map Devtools] Using original URLs from localStorage"
      );
      return originals;
    }

    // If no originals in localStorage, try to extract from the current import map
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    const importMap: Record<string, string> = {};

    importMaps.forEach((importMapEl) => {
      try {
        const map = JSON.parse(importMapEl.textContent || "{}");
        if (map.imports) {
          Object.assign(importMap, map.imports);
        }
      } catch (e) {
        console.error("Error parsing import map:", e);
      }
    });

    // Remove any override URLs to get the actual base map
    const overrides = this.getOverrides();
    for (const moduleName of Object.keys(overrides)) {
      // If the current URL is from an override, remove it
      if (importMap[moduleName] === overrides[moduleName]) {
        delete importMap[moduleName];
      }
    }

    return importMap;
  }

  /**
   * Get original URLs from localStorage
   */
  getOriginalUrls(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(ORIGINALS_STORAGE_KEY) || "{}");
    } catch (e) {
      console.error("Error retrieving original import map URLs:", e);
      return {};
    }
  }

  /**
   * Get all overrides from local storage
   */
  getOverrides(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    } catch (e) {
      console.error(
        "Error retrieving import map overrides from localStorage",
        e
      );
      return {};
    }
  }

  /**
   * Get the effective import map (base map + overrides)
   */
  getEffectiveImportMap(): Record<string, string> {
    const baseMap = this.getBaseImportMap();
    const overrides = this.getOverrides();

    return { ...baseMap, ...overrides };
  }

  /**
   * Initialize and apply any existing overrides
   * This should be called when the application starts
   */
  applyOverridesOnInit(): void {
    // If the loader is active, we don't need to apply overrides here
    if (this.loaderReady) {
      console.log(
        "[Import Map Devtools] Loader is handling overrides, skipping manual application"
      );
      return;
    }

    const overrides = this.getOverrides();
    if (Object.keys(overrides).length > 0) {
      console.log("Initializing with import map overrides:", overrides);
      this.applyOverridesToImportMap();
    }
  }

  /**
   * Get a list of all modules with their original and override URLs
   */
  getAllModules(): ImportMapModule[] {
    const originalUrls = this.getOriginalUrls();
    const baseMap = this.getBaseImportMap();
    const overrides = this.getOverrides();

    // Combine all sources to get a complete list of module names
    const allModuleNames = new Set([
      ...Object.keys(originalUrls),
      ...Object.keys(baseMap),
      ...Object.keys(overrides),
    ]);

    return Array.from(allModuleNames).map((moduleName) => {
      // The original URL is first checked from originalUrls, then from baseMap
      const originalUrl = originalUrls[moduleName] || baseMap[moduleName] || "";

      return {
        moduleName,
        originalUrl,
        overrideUrl: overrides[moduleName] || null,
      };
    });
  }

  /**
   * Check if a module is currently overridden
   */
  isOverridden(moduleName: string): boolean {
    const overrides = this.getOverrides();
    return !!overrides[moduleName];
  }

  /**
   * Override a module with a new URL
   */
  override(moduleName: string, url: string): void {
    // Before overriding, ensure we've saved the original URL
    const originals = this.getOriginalUrls();
    const baseMap = this.getBaseImportMap();

    if (!originals[moduleName] && baseMap[moduleName]) {
      // Save the original URL if we don't have it yet
      const updatedOriginals = {
        ...originals,
        [moduleName]: baseMap[moduleName],
      };
      localStorage.setItem(
        ORIGINALS_STORAGE_KEY,
        JSON.stringify(updatedOriginals)
      );
      console.log(
        `Saved original URL for ${moduleName}: ${baseMap[moduleName]}`
      );
    }

    // Now apply the override without cache busting
    const overrides = this.getOverrides();
    overrides[moduleName] = url;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
    this.dispatchChangeEvent();

    // Apply the overrides to the DOM's import map
    // The loader should handle this automatically if it's active,
    // but we'll do it manually if needed
    if (!this.loaderReady) {
      this.applyOverridesToImportMap();
    }
  }

  /**
   * Remove an override for a module
   */
  removeOverride(moduleName: string): void {
    const overrides = this.getOverrides();
    if (overrides[moduleName]) {
      delete overrides[moduleName];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
      this.dispatchChangeEvent();

      // Apply the overrides to the DOM's import map
      if (!this.loaderReady) {
        this.applyOverridesToImportMap();
      }
    }
  }

  /**
   * Reset all overrides
   */
  resetAll(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.dispatchChangeEvent();

    // Apply the overrides to the DOM's import map
    if (!this.loaderReady) {
      this.applyOverridesToImportMap();
    }
  }

  /**
   * Merge all import maps in the document
   */
  private mergeImportMaps(): boolean {
    const importMaps = document.querySelectorAll('script[type="importmap"]');

    if (importMaps.length <= 1) {
      console.log("No need to merge import maps, one or fewer found");
      return false;
    }

    console.log(`Found ${importMaps.length} import maps, merging into one`);

    // Combine all import maps
    const combined = { imports: {} as Record<string, string> };

    importMaps.forEach((importMapEl) => {
      try {
        const content = JSON.parse(importMapEl.textContent || '{"imports":{}}');
        if (content.imports) {
          Object.assign(combined.imports, content.imports);
          console.log(
            `Merged import map containing ${
              Object.keys(content.imports).length
            } modules`
          );
        }
      } catch (e) {
        console.error("Error parsing import map during merge:", e);
      }
    });

    // Create a new import map with combined content
    const newImportMap = document.createElement("script");
    newImportMap.setAttribute("type", "importmap");
    newImportMap.textContent = JSON.stringify(combined, null, 2);

    // Remove all existing import maps
    importMaps.forEach((map) => {
      if (map.parentNode) {
        map.parentNode.removeChild(map);
      }
    });

    // Add the new combined map to the head
    document.head.insertBefore(newImportMap, document.head.firstChild);
    console.log("Successfully merged all import maps into one");

    return true;
  }

  /**
   * Apply current overrides to any import maps in the DOM
   *
   * This is necessary for browsers to actually use the overridden modules
   * when they are imported. This function modifies the import map in the DOM
   * to include the overrides.
   */
  applyOverridesToImportMap(): void {
    // If the loader is active, it handles this for us
    if (this.loaderReady) {
      console.log(
        "[Import Map Devtools] Loader is handling imports, triggering reload"
      );
      // Instead of modifying the DOM directly, we trigger a storage event that the loader listens for
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_KEY,
          newValue: localStorage.getItem(LOCAL_STORAGE_KEY),
        })
      );

      // Also trigger the custom event for good measure
      window.dispatchEvent(new CustomEvent("import-map-overrides:change"));
      return;
    }

    // First, ensure we only have one import map
    const importMapElements = document.querySelectorAll(
      'script[type="importmap"]'
    );

    // If multiple import maps are found, merge them
    if (importMapElements.length > 1) {
      console.warn(
        `Found ${importMapElements.length} import maps, merging them into one`
      );
      this.mergeImportMaps();
    }

    const overrides = this.getOverrides();

    // Try to find the existing import map to modify (there should be only one now)
    let importMapEl = document.querySelector('script[type="importmap"]');

    // If no import map exists, create one
    if (!importMapEl) {
      importMapEl = document.createElement("script") as HTMLScriptElement;
      importMapEl.setAttribute("type", "importmap");
      document.head.appendChild(importMapEl);
      console.log("Created new import map element in DOM");
    }

    try {
      // Get the current import map content
      let currentMap: { imports: Record<string, string> };
      try {
        currentMap = JSON.parse(importMapEl.textContent || '{"imports":{}}');
      } catch (error) {
        console.error("Error parsing import map, creating new one", error);
        currentMap = { imports: {} };
      }

      // Apply overrides
      if (!currentMap.imports) {
        currentMap.imports = {};
      }

      // Before applying overrides, save original URLs if we don't have them yet
      const originals = this.getOriginalUrls();
      let updatedOriginals = false;
      for (const [moduleName, url] of Object.entries(currentMap.imports)) {
        if (!originals[moduleName] && !overrides[moduleName]) {
          originals[moduleName] = url as string;
          updatedOriginals = true;
        }
      }
      if (updatedOriginals) {
        localStorage.setItem(ORIGINALS_STORAGE_KEY, JSON.stringify(originals));
        console.log("Saved original URLs to localStorage:", originals);
      }

      // Check if we're actually changing anything
      let changes = 0;
      for (const [moduleName, url] of Object.entries(overrides)) {
        if (currentMap.imports[moduleName] !== url) {
          console.log(
            `Overriding "${moduleName}" from "${
              currentMap.imports[moduleName] || "undefined"
            }" to "${url}"`
          );
          currentMap.imports[moduleName] = url;
          changes++;
        }
      }

      if (changes > 0) {
        // Create the new content
        const newContent = JSON.stringify(currentMap, null, 2);
        console.log("Setting new import map content:", newContent);

        // Simply update the existing import map in place
        importMapEl.textContent = newContent;
        console.log(`Updated import map in place with ${changes} override(s)`);
      } else {
        console.log(
          "No changes needed to import map, overrides already applied"
        );
      }
    } catch (error) {
      console.error("Error applying import map overrides:", error);
    }
  }

  /**
   * Dispatch a custom event when overrides change
   */
  private dispatchChangeEvent(): void {
    window.dispatchEvent(new CustomEvent("import-map-overrides:change"));
  }
}

// Export a singleton instance
export const importMapService = new ImportMapService();

/**
 * Apply import map overrides directly to the DOM
 * This is a standalone function that can be used outside of the ImportMapService
 */
export function applyOverridesToImportMap(): boolean {
  try {
    // Check if loader is ready
    if (!window || document.readyState !== "complete") {
      console.warn(
        "Import map loader: document not ready, delaying application of overrides"
      );
      return false;
    }

    // Check for multiple import maps and merge them if needed
    const allImportMaps = document.querySelectorAll('script[type="importmap"]');

    if (allImportMaps.length > 1) {
      console.group("Import map loader: Merging multiple import maps");
      console.log(`Found ${allImportMaps.length} import maps, merging them`);

      // Combine all maps - this preserves all modules from all import maps
      const combinedMap = { imports: {} as Record<string, string> };

      allImportMaps.forEach((map, index) => {
        try {
          const mapContent = JSON.parse(map.textContent || '{"imports":{}}');
          if (mapContent.imports) {
            console.log(
              `Merging map #${index + 1} with ${
                Object.keys(mapContent.imports).length
              } entries`
            );
            Object.assign(combinedMap.imports, mapContent.imports);
          }
        } catch (err) {
          console.error(`Failed to parse import map #${index + 1}`, err);
        }
      });

      // Remove all existing maps except the first one
      for (let i = 1; i < allImportMaps.length; i++) {
        const map = allImportMaps[i];
        if (map.parentNode) {
          console.log(`Removing redundant import map #${i + 1}`);
          map.parentNode.removeChild(map);
        }
      }

      // Update the first map with the combined content
      const firstMap = allImportMaps[0] as HTMLScriptElement;
      firstMap.textContent = JSON.stringify(combinedMap, null, 2);
      console.log("Combined all import maps into one");
      console.groupEnd();
    }

    // Get the import map element (now there should be only one)
    let importMapElement = document.querySelector(
      'script[type="importmap"]'
    ) as HTMLScriptElement;

    // If no import map element exists, we create a new one
    if (!importMapElement) {
      console.warn(
        "Import map loader: No import map found, creating a new one"
      );
      importMapElement = document.createElement("script");
      importMapElement.type = "importmap";
      document.head.appendChild(importMapElement);
    }

    // Parse current import map
    let currentImportMap: { imports: Record<string, string> } = { imports: {} };
    try {
      if (importMapElement.textContent) {
        currentImportMap = JSON.parse(importMapElement.textContent);
      }
    } catch (err) {
      console.error(
        "Import map loader: Failed to parse current import map",
        err
      );
      return false;
    }

    // Ensure imports object exists
    if (!currentImportMap.imports) {
      currentImportMap.imports = {};
    }

    // Get overrides from localStorage
    const overridesJson = localStorage.getItem("import-map-overrides");
    if (!overridesJson) {
      console.log("Import map loader: No overrides found in localStorage");
      return true; // No error, just no overrides
    }

    // Parse overrides
    let overrides: Record<string, string>;
    try {
      overrides = JSON.parse(overridesJson);
    } catch (err) {
      console.error(
        "Import map loader: Failed to parse overrides from localStorage",
        err
      );
      return false;
    }

    // Save original URLs to localStorage if they don't exist
    const originals: Record<string, string> = {};
    let originalsChanged = false;
    const originalsJson = localStorage.getItem("import-map-originals");
    const existingOriginals = originalsJson ? JSON.parse(originalsJson) : {};

    // Apply overrides to the current import map
    console.group("Import map loader: Applying overrides");
    for (const [moduleName, overrideUrl] of Object.entries(overrides)) {
      // Save original if not already saved
      if (
        currentImportMap.imports[moduleName] &&
        currentImportMap.imports[moduleName] !== overrideUrl &&
        !existingOriginals[moduleName]
      ) {
        originals[moduleName] = currentImportMap.imports[moduleName];
        originalsChanged = true;
        console.log(
          `Saving original URL for "${moduleName}": ${originals[moduleName]}`
        );
      }

      // Apply override - only modify modules that are explicitly overridden
      const oldValue = currentImportMap.imports[moduleName];
      currentImportMap.imports[moduleName] = overrideUrl;
      console.log(
        `Overriding "${moduleName}": ${oldValue || "(new)"} -> ${overrideUrl}`
      );
    }
    console.groupEnd();

    // Save originals if any new ones were added
    if (originalsChanged) {
      const newOriginals = { ...existingOriginals, ...originals };
      localStorage.setItem(
        "import-map-originals",
        JSON.stringify(newOriginals)
      );
    }

    // Update the import map content in the DOM
    importMapElement.textContent = JSON.stringify(currentImportMap, null, 2);

    // No need to remove and re-add the import map - just update it in place
    console.log(
      "Import map loader: Updated import map in DOM with overrides applied"
    );

    return true;
  } catch (err) {
    console.error("Import map loader: Error applying overrides", err);
    return false;
  }
}

/**
 * Function to reset all overrides
 */
export function resetAllOverrides(): boolean {
  // Get the list of overridden modules before clearing
  const overridesJson = localStorage.getItem("import-map-overrides");
  const overriddenModules = overridesJson
    ? Object.keys(JSON.parse(overridesJson))
    : [];

  // Clear overrides from localStorage
  localStorage.removeItem("import-map-overrides");

  // Get originals to restore them
  const originalsJson = localStorage.getItem("import-map-originals");
  if (!originalsJson) {
    console.log("Import map loader: No originals found to restore");
    return true;
  }

  try {
    const originals = JSON.parse(originalsJson);

    // Get the import map element
    const importMapElement = document.querySelector(
      'script[type="importmap"]'
    ) as HTMLScriptElement;

    if (!importMapElement) {
      console.error("Import map loader: No import map found for reset");
      return false;
    }

    // Parse current import map
    let currentImportMap: { imports: Record<string, string> } = { imports: {} };
    try {
      if (importMapElement.textContent) {
        currentImportMap = JSON.parse(importMapElement.textContent);
      }
    } catch (err) {
      console.error(
        "Import map loader: Failed to parse current import map",
        err
      );
      return false;
    }

    // Restore original URLs, but only for modules that were overridden
    console.group("Import map loader: Resetting to original URLs");
    for (const moduleName of overriddenModules) {
      if (originals[moduleName]) {
        console.log(
          `Restoring "${moduleName}": ${currentImportMap.imports[moduleName]} -> ${originals[moduleName]}`
        );
        currentImportMap.imports[moduleName] = originals[moduleName];
      } else {
        // If we don't have an original for an overridden module, just leave it as is
        console.log(`No original found for "${moduleName}", leaving as is`);
      }
    }
    console.groupEnd();

    // Update the import map content in the DOM
    importMapElement.textContent = JSON.stringify(currentImportMap, null, 2);
    console.log("Import map loader: Reset import map to original URLs");

    // Clear originals from localStorage as they've been restored
    localStorage.removeItem("import-map-originals");

    return true;
  } catch (err: unknown) {
    console.error("Import map loader: Error resetting overrides", err);
    return false;
  }
}

// Export utility functions alongside the service
export const importMapUtils = {
  applyOverridesToImportMap,
  resetAllOverrides,
};
