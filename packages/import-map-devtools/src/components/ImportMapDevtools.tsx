import React, { useState } from "react";
import { useImportMap } from "../hooks/useImportMap";
import { ModuleList } from "./ModuleList";
import { Button } from "./ui/button";
import { ImportMapModule } from "../services/import-map";
import { Input } from "./ui/input";

interface ImportMapDevtoolsProps {
  buttonPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  buttonText?: string;
  className?: string;
  buttonVariant?: "solid" | "outline" | "minimal";
}

export function ImportMapDevtools({
  buttonPosition = "bottom-right",
  buttonText = "Import Map",
  className = "",
  buttonVariant = "solid",
}: ImportMapDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const {
    modules,
    isLoading,
    overrideModule,
    removeOverride,
    resetAllOverrides,
  } = useImportMap();

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
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/30 transition-all duration-200",
    outline:
      "bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-300 hover:border-indigo-500 shadow-sm",
    minimal:
      "bg-white/80 hover:bg-white text-gray-800 shadow-sm backdrop-blur-sm",
  };

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <>
      <button
        onClick={toggleOpen}
        className={`fixed ${positionClasses[buttonPosition]} z-50 font-medium py-2 px-4 rounded-full ${buttonVariantClasses[buttonVariant]} flex items-center space-x-2 transform hover:scale-105 transition-all duration-200 ${className}`}
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
        <div
          className="fixed inset-0 z-40 overflow-hidden bg-slate-900/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleOpen();
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Import Map Overrides
              </h2>
              <button
                onClick={toggleOpen}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
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
                    className="pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                  {filter && (
                    <button
                      onClick={() => setFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                <div>
                  <Button
                    variant="destructive"
                    onClick={resetAllOverrides}
                    className="w-full sm:w-auto shadow-sm hover:shadow transition-all"
                  >
                    Reset All Overrides
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-800/50">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : filteredModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-slate-400 mb-4"
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
                  <p className="text-slate-500 dark:text-slate-400">
                    {filter
                      ? "No modules match your filter"
                      : "No modules found. Make sure you have an import map on this page."}
                  </p>
                </div>
              ) : (
                <ModuleList
                  modules={filteredModules}
                  onReset={removeOverride}
                  onSave={overrideModule}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
