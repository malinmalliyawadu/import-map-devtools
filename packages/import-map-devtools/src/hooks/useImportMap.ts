import { useState, useEffect, useCallback } from "react";
import { ImportMapModule, importMapService } from "../services/import-map";

export function useImportMap() {
  const [modules, setModules] = useState<ImportMapModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshModules = useCallback(() => {
    setModules(importMapService.getAllModules());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial load and apply any existing overrides
    // This ensures import maps are updated when the component mounts
    refreshModules();
    importMapService.applyOverridesOnInit();

    // Listen for changes
    const handleChange = () => {
      refreshModules();
    };

    window.addEventListener("import-map-overrides:change", handleChange);

    return () => {
      window.removeEventListener("import-map-overrides:change", handleChange);
    };
  }, [refreshModules]);

  const overrideModule = useCallback((moduleName: string, url: string) => {
    importMapService.override(moduleName, url);
  }, []);

  const removeOverride = useCallback((moduleName: string) => {
    importMapService.removeOverride(moduleName);
  }, []);

  const resetAllOverrides = useCallback(() => {
    importMapService.resetAll();
  }, []);

  const isOverridden = useCallback((moduleName: string) => {
    return importMapService.isOverridden(moduleName);
  }, []);

  return {
    modules,
    isLoading,
    overrideModule,
    removeOverride,
    resetAllOverrides,
    isOverridden,
    refreshModules,
  };
}
