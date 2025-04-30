const LOCAL_STORAGE_KEY = "import-map-overrides";

export interface ImportMapModule {
  moduleName: string;
  originalUrl: string;
  overrideUrl: string | null;
}

export class ImportMapService {
  /**
   * Get the current import map from the DOM
   */
  getBaseImportMap(): Record<string, string> {
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    const importMap: Record<string, string> = {};

    importMaps.forEach((importMapEl) => {
      const map = JSON.parse(importMapEl.textContent || "{}");
      if (map.imports) {
        Object.assign(importMap, map.imports);
      }
    });

    return importMap;
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
   * Get a list of all modules with their original and override URLs
   */
  getAllModules(): ImportMapModule[] {
    const baseMap = this.getBaseImportMap();
    const overrides = this.getOverrides();
    const allModuleNames = new Set([
      ...Object.keys(baseMap),
      ...Object.keys(overrides),
    ]);

    return Array.from(allModuleNames).map((moduleName) => ({
      moduleName,
      originalUrl: baseMap[moduleName] || "",
      overrideUrl: overrides[moduleName] || null,
    }));
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
    const overrides = this.getOverrides();
    overrides[moduleName] = url;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
    this.dispatchChangeEvent();
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
    }
  }

  /**
   * Reset all overrides
   */
  resetAll(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.dispatchChangeEvent();
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
