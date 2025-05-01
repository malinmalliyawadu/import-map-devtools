import React, { useState, useEffect } from "react";
import { useImportMap } from "../hooks/useImportMap";
import { ModuleList } from "./ModuleList";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Type for storing module override history entries
interface OverrideHistoryEntry {
  url: string;
  timestamp: number; // Unix timestamp
}

// Type for storing override history by module name
interface ModuleOverrideHistory {
  [moduleName: string]: OverrideHistoryEntry[];
}

// Type for storing active overrides by module name
interface ActiveOverrides {
  [moduleName: string]: string;
}

interface ImportMapDevtoolsProps {
  buttonPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  buttonText?: string;
  className?: string;
  buttonVariant?: "solid" | "outline" | "minimal" | "glass";
}

export function ImportMapDevtools({
  buttonPosition = "bottom-right",
  buttonText = "Import Map",
  className = "",
  buttonVariant = "solid",
}: ImportMapDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  // Track override history separately from active overrides
  const [moduleOverrideHistory, setModuleOverrideHistory] =
    useState<ModuleOverrideHistory>({});
  const [activeOverrides, setActiveOverrides] = useState<ActiveOverrides>({});
  const [, setOriginalImportMap] = useState<Record<string, string> | null>(
    null
  );
  // Animation state for dialog opening/closing
  const [isClosing, setIsClosing] = useState(false);

  const {
    modules,
    isLoading,
    overrideModule,
    removeOverride,
    resetAllOverrides,
  } = useImportMap();

  // Restore all saved state from localStorage on initial load
  useEffect(() => {
    try {
      // Restore original import map if it exists
      const savedOriginal = localStorage.getItem(
        "import-map-devtools-original"
      );
      if (savedOriginal) {
        setOriginalImportMap(JSON.parse(savedOriginal));
      }

      // Restore active overrides
      const savedActiveOverrides = localStorage.getItem(
        "import-map-devtools-active-overrides"
      );
      if (savedActiveOverrides) {
        setActiveOverrides(JSON.parse(savedActiveOverrides));
      }

      // Restore override history
      const savedHistory = localStorage.getItem(
        "import-map-devtools-override-history"
      );
      if (savedHistory) {
        setModuleOverrideHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to restore saved state:", error);
    }
  }, []);

  // Wrapper for override module that also saves the override by module
  const handleOverrideModule = (moduleName: string, url: string) => {
    overrideModule(moduleName, url);

    // Get current time for history entry
    const timestamp = Date.now();

    // Update active overrides
    const newActiveOverrides = { ...activeOverrides, [moduleName]: url };
    setActiveOverrides(newActiveOverrides);

    // Update the module override history
    const newHistory = { ...moduleOverrideHistory };

    // If this module doesn't have a history yet, create an array
    if (!newHistory[moduleName]) {
      newHistory[moduleName] = [];
    }

    // Add new history entry (avoid duplicates)
    const existingEntryIndex = newHistory[moduleName].findIndex(
      (entry) => entry.url === url
    );
    if (existingEntryIndex >= 0) {
      // Update timestamp on existing entry
      newHistory[moduleName][existingEntryIndex].timestamp = timestamp;
    } else {
      // Add new entry
      newHistory[moduleName].push({ url, timestamp });
    }

    // Sort by most recent
    newHistory[moduleName].sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the most recent 10 entries
    if (newHistory[moduleName].length > 10) {
      newHistory[moduleName] = newHistory[moduleName].slice(0, 10);
    }

    setModuleOverrideHistory(newHistory);

    // Save to localStorage
    try {
      localStorage.setItem(
        "import-map-devtools-active-overrides",
        JSON.stringify(newActiveOverrides)
      );
      localStorage.setItem(
        "import-map-devtools-override-history",
        JSON.stringify(newHistory)
      );
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  };

  // Handle reset for a specific module
  const handleResetModule = (moduleName: string) => {
    removeOverride(moduleName);

    // Remove from active overrides (but keep in history)
    const newActiveOverrides = { ...activeOverrides };
    delete newActiveOverrides[moduleName];
    setActiveOverrides(newActiveOverrides);

    // Update localStorage
    try {
      localStorage.setItem(
        "import-map-devtools-active-overrides",
        JSON.stringify(newActiveOverrides)
      );
    } catch (error) {
      console.error("Failed to save after reset:", error);
    }
  };

  const filteredModules = modules.filter(
    (module) =>
      module.moduleName.toLowerCase().includes(filter.toLowerCase()) ||
      module.originalUrl.toLowerCase().includes(filter.toLowerCase()) ||
      (module.overrideUrl &&
        module.overrideUrl.toLowerCase().includes(filter.toLowerCase()))
  );

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  const buttonVariantClasses = {
    solid:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/40 shadow-indigo-500/20 transition-all duration-300",
    outline:
      "bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-300 hover:border-indigo-500 hover:shadow-indigo-500/30 shadow-md transition-all duration-300",
    minimal:
      "bg-white/90 hover:bg-white text-gray-800 shadow-md hover:shadow-lg backdrop-blur-sm transition-all duration-300",
    glass:
      "bg-white/30 hover:bg-white/40 backdrop-blur-md text-slate-800 border border-white/50 shadow-xl hover:shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all duration-300",
  };

  // Controlled open/close with animation
  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match this with animation duration
  };

  // Check if we have any overrides
  const hasOverrides = filteredModules.some((m) => !!m.overrideUrl);

  // Count active overrides
  const activeOverrideCount = filteredModules.filter(
    (m) => !!m.overrideUrl
  ).length;

  return (
    <>
      <button
        onClick={handleOpen}
        className={`fixed ${positionClasses[buttonPosition]} z-50 font-medium py-2 px-4 rounded-full ${buttonVariantClasses[buttonVariant]} flex items-center space-x-2 transform hover:scale-105 active:scale-95 transition-all duration-300 ${className} group`}
        aria-label="Toggle Import Map Devtools"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span className="relative overflow-hidden">
          <span className="group-hover:translate-y-full group-hover:opacity-0 transition-all duration-300 inline-block">
            {buttonText}
          </span>
          <span className="absolute top-0 left-0 -translate-y-full group-hover:translate-y-0 transition-all duration-300">
            {buttonText}
          </span>
        </span>
        {activeOverrideCount > 0 && (
          <span className="ml-1 bg-white text-indigo-600 font-semibold text-xs py-0.5 px-1.5 rounded-full inline-flex items-center justify-center min-w-[1.25rem] shadow-inner shadow-indigo-100 group-hover:scale-110 transition-transform duration-300">
            {activeOverrideCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`fixed inset-0 z-[9999] overflow-hidden bg-slate-900/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isClosing ? "animate-out fade-out" : "animate-in fade-in"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className={`bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${
              isClosing
                ? "animate-out slide-out-to-bottom-10 duration-300 zoom-out-95"
                : "animate-in slide-in-from-bottom-10 duration-300 zoom-in-95"
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-800 dark:to-violet-800 text-white shadow-md animate-in fade-in-75 slide-in-from-top-2 duration-500">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg shadow-inner shadow-black/10 animate-in fade-in zoom-in-75 duration-700 delay-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-shadow animate-in slide-in-from-left-4 duration-700 delay-150">
                  Import Map Overrides
                </h2>
                {activeOverrideCount > 0 && (
                  <span className="bg-white text-indigo-600 font-semibold text-xs py-1 px-2 rounded-full shadow shadow-black/10 animate-in fade-in zoom-in duration-700 delay-200">
                    {activeOverrideCount} active
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white rounded-full p-2 hover:bg-white/10 transition-colors hover:rotate-90 transition-transform duration-300"
                aria-label="Close Import Map Devtools"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4 bg-slate-50 dark:bg-slate-800/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700 delay-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 group animate-in fade-in-50 slide-in-from-left-4 duration-700 delay-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter modules..."
                    className="pl-10 pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-md transition-shadow duration-300 focus:shadow-lg"
                  />
                  {filter && (
                    <button
                      onClick={() => setFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm hover:shadow active:scale-90 transition-transform"
                      aria-label="Clear filter"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex gap-2 animate-in fade-in-50 slide-in-from-right-4 duration-700 delay-300">
                  <Button
                    variant="destructive"
                    onClick={resetAllOverrides}
                    className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all flex items-center gap-1 active:scale-95 transition-transform"
                    disabled={!hasOverrides}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset All
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900 rounded-b-xl animate-in fade-in-75 slide-in-from-bottom-4 duration-700 delay-300">
              {isLoading ? (
                <div className="flex flex-col justify-center items-center h-40 space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent shadow-md"></div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
                    Loading modules...
                  </p>
                </div>
              ) : filteredModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-slate-100 dark:border-slate-800 shadow-lg animate-in fade-in zoom-in-95 duration-700">
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-4 shadow-inner animate-in zoom-in-50 duration-700 delay-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1 drop-shadow animate-in fade-in-50 slide-in-from-bottom-2 duration-700 delay-150">
                    No modules found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm animate-in fade-in-50 slide-in-from-bottom-1 duration-700 delay-200">
                    {filter
                      ? "No modules match your filter. Try a different search term."
                      : "No modules found. Make sure you have an import map on this page."}
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in-75 duration-500 delay-300">
                  <ModuleList
                    modules={filteredModules}
                    onReset={handleResetModule}
                    onSave={handleOverrideModule}
                    moduleOverrideHistory={moduleOverrideHistory}
                    activeOverrides={activeOverrides}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
