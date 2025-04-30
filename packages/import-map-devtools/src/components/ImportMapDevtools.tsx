import React, { useState, useCallback } from "react";
import { useImportMap } from "../hooks/useImportMap";
import { ModuleList } from "./ModuleList";
import { Button } from "./ui/button";
import { ModuleEditDialog } from "./ModuleEditDialog";
import { ImportMapModule } from "../services/import-map";
import { Input } from "./ui/input";

interface ImportMapDevtoolsProps {
  buttonPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  buttonText?: string;
  className?: string;
}

export function ImportMapDevtools({
  buttonPosition = "bottom-right",
  buttonText = "Import Map",
  className = "",
}: ImportMapDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ImportMapModule | null>(
    null
  );
  const [filter, setFilter] = useState("");

  const {
    modules,
    isLoading,
    overrideModule,
    removeOverride,
    resetAllOverrides,
  } = useImportMap();

  const handleOpenDialog = useCallback((module: ImportMapModule) => {
    setSelectedModule(module);
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedModule(null);
  }, []);

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

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <>
      <button
        onClick={toggleOpen}
        className={`fixed ${positionClasses[buttonPosition]} z-50 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg flex items-center space-x-1 ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden bg-gray-800/75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-xl font-bold text-gray-900">
                Import Map Overrides
              </h2>
              <button
                onClick={toggleOpen}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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

            <div className="p-4 border-b space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter modules..."
                    className="pr-10"
                  />
                  {filter && (
                    <button
                      onClick={() => setFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
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
                <div className="ml-4">
                  <Button variant="destructive" onClick={resetAllOverrides}>
                    Reset All Overrides
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 inline-block rounded-full bg-blue-100 border border-blue-300"></span>
                  <span>Overridden</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 inline-block rounded-full bg-white border border-gray-200"></span>
                  <span>Default</span>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                </div>
              ) : (
                <ModuleList
                  modules={filteredModules}
                  onEdit={handleOpenDialog}
                  onReset={removeOverride}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ModuleEditDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        module={selectedModule}
        onSave={overrideModule}
      />
    </>
  );
}
