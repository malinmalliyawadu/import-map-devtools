import React, { useState, useEffect } from "react";
import { ImportMapDevtools } from "import-map-devtools";

export default function App() {
  const [modules, setModules] = useState<Record<string, string>>({});

  // Load the current import map to display on the page
  useEffect(() => {
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
              <h2 className="text-xl font-semibold mb-4">Current Import Map</h2>
              <p className="mb-4 text-gray-600">
                This demo page includes an import map in the HTML. Use the
                Import Map button at the bottom-right to override these modules.
              </p>

              {/* Display the current import map */}
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Modules:</h3>
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

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Click the "Import Map" button in the bottom-right corner to
                    open the devtools
                  </li>
                  <li>
                    Try overriding one of the modules with a different URL
                  </li>
                  <li>Refresh the page - your overrides should persist</li>
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
