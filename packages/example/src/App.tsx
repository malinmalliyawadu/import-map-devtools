import { useState, useEffect } from "react";
import { ImportMapDevtools, importMapService } from "import-map-devtools";

// Type definitions for the dynamically imported modules
declare global {
  interface Window {
    demoModuleImports: {
      [key: string]: any;
    };
  }
}

export default function App() {
  const [modules, setModules] = useState<Record<string, string>>({});
  const [overriddenModules, setOverriddenModules] = useState<
    Record<string, string>
  >({});
  const [originalModules, setOriginalModules] = useState<
    Record<string, string>
  >({});
  const [loadedModules, setLoadedModules] = useState<Record<string, any>>({});
  const [moduleDetails, setModuleDetails] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  // Function to load both the original import map and current overrides
  const refreshModules = () => {
    // Get the current import map from any script[type="importmap"] elements
    const importMaps = document.querySelectorAll('script[type="importmap"]');
    const combinedImports: Record<string, string> = {};

    importMaps.forEach((importMapEl) => {
      try {
        const map = JSON.parse(importMapEl.textContent || "{}");
        if (map.imports) {
          Object.assign(combinedImports, map.imports);
        }
      } catch (error) {
        console.error("Error parsing import map:", error);
      }
    });

    setModules(combinedImports);

    // Get current overrides from local storage
    const overrides = importMapService.getOverrides();
    setOverriddenModules(overrides);

    // Get original URLs from local storage
    const originals = importMapService.getOriginalUrls();
    setOriginalModules(originals);
  };

  // Function to dynamically import modules from the import map
  const importModules = async () => {
    try {
      setError(null);

      // First, ensure any overrides are applied to the DOM's import map
      importMapService.applyOverridesToImportMap();

      // Then forcefully replace the import map to ensure it's completely refreshed
      forceReplaceImportMap();

      // Get the effective import map
      const effectiveMap = importMapService.getEffectiveImportMap();
      const imports: Record<string, any> = {};
      const details: Record<string, string> = {};

      // Create a global object to hold module imports so we can see them in the console
      window.demoModuleImports = {};

      // Import each module
      for (const [moduleName, url] of Object.entries(effectiveMap)) {
        try {
          console.log(`Importing module: ${moduleName} from ${url}`);

          // Import the module directly
          const module = await import(/* @vite-ignore */ moduleName);

          imports[moduleName] = module;
          window.demoModuleImports[moduleName] = module;

          // Try to extract version or other identifying information
          let versionInfo = "Unknown version";

          if (moduleName === "demo-module-1") {
            // React
            if (module.version) {
              versionInfo = `React version: ${module.version}`;
            } else if (
              module.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
            ) {
              versionInfo = "React detected (version not directly accessible)";
            }
          } else if (moduleName === "demo-module-2") {
            // Lodash
            if (module.VERSION) {
              versionInfo = `Lodash version: ${module.VERSION}`;
            } else {
              versionInfo = "Lodash detected (version not accessible)";
            }
          } else if (moduleName === "demo-module-3") {
            // Moment
            if (module.version) {
              versionInfo = `Moment.js version: ${module.version}`;
            }
          }

          details[moduleName] = versionInfo;
          console.log(`Imported ${moduleName}:`, module, versionInfo);
        } catch (err: any) {
          console.error(`Error importing ${moduleName}:`, err);
          imports[moduleName] = { error: err };
          details[moduleName] = `Error: ${err.message || "Unknown error"}`;
        }
      }

      setLoadedModules(imports);
      setModuleDetails(details);
    } catch (err: any) {
      console.error("Error importing modules:", err);
      setError("Failed to import modules. See console for details.");
    }
  };

  // Force reload the page to ensure changes take effect
  const forceReload = () => {
    window.location.reload();
  };

  // Helper function to forcefully replace import map in DOM
  const forceReplaceImportMap = () => {
    // Get current import map from DOM - only use the first one if multiple are found
    const importMapElements = document.querySelectorAll(
      'script[type="importmap"]'
    );

    if (importMapElements.length === 0) {
      console.error("No import map found in DOM");
      return false;
    }

    // If multiple import maps are found, log a warning and use only the first one
    if (importMapElements.length > 1) {
      console.warn(
        `Found ${importMapElements.length} import maps, using only the first one`
      );

      // Remove additional import maps to avoid duplicates
      for (let i = 1; i < importMapElements.length; i++) {
        const mapToRemove = importMapElements[i];
        if (mapToRemove.parentNode) {
          console.log(`Removing redundant import map #${i + 1}`);
          mapToRemove.parentNode.removeChild(mapToRemove);
        }
      }
    }

    // Use only the first import map
    const importMapEl = importMapElements[0];

    try {
      // Parse the current import map
      const currentMap = JSON.parse(importMapEl.textContent || "{}");

      // Get overrides
      const overrides = importMapService.getOverrides();

      // Ensure the imports object exists in the current map
      if (!currentMap.imports) {
        currentMap.imports = {};
      }

      // Only apply overrides - DO NOT alter non-overridden modules
      // This ensures we preserve all original modules
      for (const [moduleName, url] of Object.entries(overrides)) {
        // Only update modules that are specifically overridden
        currentMap.imports[moduleName] = url;
      }

      // Update the existing import map in place
      const newContent = JSON.stringify(currentMap, null, 2);

      // Simply update the textContent instead of creating a new element
      importMapEl.textContent = newContent;
      console.log("Updated import map content in place:", currentMap);

      return true;
    } catch (error) {
      console.error("Error forcefully replacing import map:", error);
      return false;
    }
  };

  // Initial load
  useEffect(() => {
    refreshModules();

    // Make sure to apply any existing overrides when the app starts
    try {
      importMapService.applyOverridesToImportMap();
    } catch (err: any) {
      console.error("Error applying initial overrides:", err);
    }

    // Listen for changes to import map overrides
    const handleOverrideChange = () => {
      refreshModules();
      // Re-import modules when overrides change
      importModules();
    };

    window.addEventListener(
      "import-map-overrides:change",
      handleOverrideChange
    );

    // Import modules on initial load after a short delay to ensure overrides are applied
    setTimeout(() => {
      importModules();
    }, 100);

    return () => {
      window.removeEventListener(
        "import-map-overrides:change",
        handleOverrideChange
      );
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Import Map Devtools Demo
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 bg-white">
              <h2 className="text-xl font-semibold mb-4">Import Map Demo</h2>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="text-md font-medium text-yellow-800 mb-1">
                  Browser Cache Note:
                </h3>
                <p className="text-sm text-yellow-700">
                  Browsers may cache imported modules. If you don't see changes
                  after applying overrides:
                </p>
                <ul className="list-disc pl-5 text-sm text-yellow-700 mt-1">
                  <li>Use a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)</li>
                  <li>Or use an incognito/private window for testing</li>
                  <li>
                    Click the "Reset All Overrides" button when you're done
                    testing
                  </li>
                </ul>
              </div>

              {/* Import Map Debug Info */}
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-md font-medium text-red-800 mb-1">
                  Current Import Map in DOM:
                </h3>
                <pre className="bg-black text-green-400 p-3 rounded text-xs overflow-auto max-h-40">
                  {(() => {
                    const importMaps = document.querySelectorAll(
                      'script[type="importmap"]'
                    );
                    if (importMaps.length === 0)
                      return "No import map found in DOM";

                    let output = "";
                    importMaps.forEach((map, i) => {
                      try {
                        const parsed = JSON.parse(map.textContent || "{}");
                        output += `Import Map #${i + 1}:\n`;
                        output += JSON.stringify(parsed, null, 2);
                        output += "\n\n";
                      } catch (e) {
                        output += `Import Map #${i + 1} (invalid JSON):\n`;
                        output += map.textContent;
                        output += "\n\n";
                      }
                    });
                    return output;
                  })()}
                </pre>
                <button
                  onClick={() => {
                    refreshModules();
                    // Force the component to re-render to refresh the display
                    setError(error ? error : null);
                  }}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Refresh Import Map View
                </button>
              </div>

              <p className="mb-4 text-gray-600">
                This demo includes an import map with three modules: React,
                Lodash, and Moment.js. Use the Import Map button to override
                these with different versions.
              </p>

              {/* Display loaded modules */}
              <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-8">
                <h3 className="text-lg font-medium mb-2">Loaded Modules:</h3>
                {error && (
                  <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded mb-4">
                    {error}
                  </div>
                )}
                {Object.keys(loadedModules).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(loadedModules).map(
                      ([moduleName, module]) => (
                        <div
                          key={moduleName}
                          className={`bg-white p-3 rounded shadow-sm ${
                            overriddenModules[moduleName]
                              ? "border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          <p className="font-medium">
                            {moduleName}
                            {overriddenModules[moduleName] && (
                              <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                Overridden
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-700">
                            {module.error ? (
                              <span className="text-red-500">
                                Failed to load
                              </span>
                            ) : (
                              <span className="text-green-600">
                                Successfully loaded:{" "}
                                {moduleDetails[moduleName] ||
                                  "No version info available"}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <small>
                              Module details available in the console under{" "}
                              <code>window.demoModuleImports</code>
                            </small>
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p>No modules loaded yet.</p>
                )}
                <div className="mt-3">
                  <button
                    onClick={importModules}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Reload Modules
                  </button>
                </div>
              </div>

              {/* Display the original import map from localStorage */}
              <div className="bg-yellow-50 p-4 rounded-md mb-8 border border-yellow-200">
                <h3 className="text-lg font-medium mb-2">
                  Original URLs (from localStorage):
                </h3>
                {Object.keys(originalModules).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(originalModules).map(
                      ([moduleName, url]) => (
                        <div
                          key={moduleName}
                          className="bg-white p-3 rounded shadow-sm"
                        >
                          <p className="font-medium text-yellow-700">
                            {moduleName}
                          </p>
                          <p className="text-sm text-yellow-600 break-all">
                            {url}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p>No original URLs found in localStorage.</p>
                )}
              </div>

              {/* Display the original import map */}
              <div className="bg-gray-100 p-4 rounded-md mb-8">
                <h3 className="text-lg font-medium mb-2">
                  Current Import Map:
                </h3>
                {Object.keys(modules).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(modules).map(([moduleName, url]) => (
                      <div
                        key={moduleName}
                        className="bg-white p-3 rounded shadow-sm"
                      >
                        <p className="font-medium">{moduleName}</p>
                        <p className="text-sm text-gray-500 break-all">{url}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No import map found on this page.</p>
                )}
              </div>

              {/* Display the overridden modules */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="text-lg font-medium mb-2">Active Overrides:</h3>
                {Object.keys(overriddenModules).length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {Object.entries(overriddenModules).map(
                        ([moduleName, url]) => (
                          <div
                            key={moduleName}
                            className="bg-white p-3 rounded shadow-sm border border-blue-300"
                          >
                            <p className="font-medium text-blue-700">
                              {moduleName}
                            </p>
                            <p className="text-sm text-blue-600 break-all font-medium">
                              {url}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Original:{" "}
                              {originalModules[moduleName] ||
                                modules[moduleName] ||
                                "Not found in original import map"}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          // Reset all overrides
                          importMapService.resetAll();
                          console.log("Reset all overrides");
                          // Refresh the display
                          refreshModules();
                          // Force replace the import map in DOM
                          forceReplaceImportMap();
                          // Reload modules to reflect changes
                          importModules();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Reset All Overrides
                      </button>
                    </div>
                  </>
                ) : (
                  <p>
                    No active overrides. Try setting one using the Import Map
                    devtools!
                  </p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-2">
                  Example Override URLs:
                </h3>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <h4 className="font-medium">React (different versions):</h4>
                  <div className="flex items-center justify-between flex-wrap mt-2">
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      <li>
                        https://cdn.jsdelivr.net/npm/react@17.0.2/umd/react.production.min.js
                      </li>
                      <li>
                        https://cdn.jsdelivr.net/npm/react@16.14.0/umd/react.production.min.js
                      </li>
                    </ul>
                    <div className="flex mt-2 sm:mt-0 space-x-2">
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-1",
                            "https://cdn.jsdelivr.net/npm/react@17.0.2/umd/react.production.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Apply v17
                      </button>
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-1",
                            "https://cdn.jsdelivr.net/npm/react@16.14.0/umd/react.production.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Apply v16
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <h4 className="font-medium">Lodash (different versions):</h4>
                  <div className="flex items-center justify-between flex-wrap mt-2">
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      <li>
                        https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js
                      </li>
                      <li>
                        https://cdn.jsdelivr.net/npm/lodash@4.17.15/lodash.min.js
                      </li>
                    </ul>
                    <div className="flex mt-2 sm:mt-0 space-x-2">
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-2",
                            "https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Apply v4.17.20
                      </button>
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-2",
                            "https://cdn.jsdelivr.net/npm/lodash@4.17.15/lodash.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Apply v4.17.15
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-medium">
                    Moment.js (different versions):
                  </h4>
                  <div className="flex items-center justify-between flex-wrap mt-2">
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      <li>
                        https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js
                      </li>
                      <li>
                        https://cdn.jsdelivr.net/npm/moment@2.28.0/moment.min.js
                      </li>
                    </ul>
                    <div className="flex mt-2 sm:mt-0 space-x-2">
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-3",
                            "https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        Apply v2.29.1
                      </button>
                      <button
                        onClick={() => {
                          importMapService.override(
                            "demo-module-3",
                            "https://cdn.jsdelivr.net/npm/moment@2.28.0/moment.min.js"
                          );
                          refreshModules();
                          forceReplaceImportMap();
                          importModules();
                        }}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        Apply v2.28.0
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-red-50 p-3 rounded-md border border-red-200">
                  <button
                    onClick={() => {
                      // Reset all overrides
                      importMapService.resetAll();
                      console.log("Reset all overrides");
                      // Refresh the display
                      refreshModules();
                      // Force replace the import map in DOM
                      forceReplaceImportMap();
                      // Reload modules to reflect changes
                      importModules();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Reset All Overrides
                  </button>
                  <p className="mt-2 text-sm text-gray-600">
                    Click this button to remove all overrides and restore
                    original module versions.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Click the "Import Map" button in the bottom-right corner to
                    open the devtools
                  </li>
                  <li>
                    Try overriding one of the modules with a different version
                    URL (examples provided above)
                  </li>
                  <li>
                    You should see the override appear in the "Active Overrides"
                    section
                  </li>
                  <li>Click "Reload Modules" to see the changes take effect</li>
                  <li>
                    Hard refresh the page (Ctrl+Shift+R) to ensure browser cache
                    is cleared
                  </li>
                  <li>Reset the overrides when done</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Import Map Devtools */}
      <ImportMapDevtools
        buttonPosition="bottom-right"
        buttonText="Import Map"
      />
    </div>
  );
}
