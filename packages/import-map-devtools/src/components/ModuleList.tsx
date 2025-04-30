import React, { useState, useEffect, useRef, useCallback } from "react";
import { ImportMapModule } from "../services/import-map";
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

// Type for tracking URL validation status
interface ValidationStatus {
  isValid: boolean | null; // null means not validated yet
  isValidating: boolean;
  error?: string;
}

// Custom debounce function
function useDebounce<T>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        // Type assertion is safe because we're passing through the args
        (callback as (...callbackArgs: unknown[]) => unknown)(...args);
      }, delay);
    },
    [callback, delay]
  );
}

interface ModuleListProps {
  modules: ImportMapModule[];
  onReset: (moduleName: string) => void;
  onSave: (moduleName: string, url: string) => void;
  moduleOverrideHistory: ModuleOverrideHistory;
  activeOverrides: ActiveOverrides;
}

export function ModuleList({
  modules,
  onReset,
  onSave,
  moduleOverrideHistory,
}: ModuleListProps) {
  const [editStates, setEditStates] = useState<
    Record<
      string,
      {
        value: string;
        isEditing: boolean;
        isSaving: boolean;
        saveSuccess: boolean | null;
        validation: ValidationStatus;
      }
    >
  >({});

  // Track which popover is open
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Function to validate a URL
  const validateModuleUrl = useCallback(
    async (url: string): Promise<ValidationStatus> => {
      if (!url) {
        return { isValid: false, isValidating: false, error: "URL is empty" };
      }

      try {
        // Add a cache-busting query parameter to avoid getting cached responses
        const urlWithParam = new URL(url);
        urlWithParam.searchParams.append(
          "_devtools_validate",
          Date.now().toString()
        );

        // Fetch the URL with a HEAD request to check if it exists
        const response = await fetch(urlWithParam.toString(), {
          method: "HEAD",
          // Using no-cors mode will make the request succeed but won't give us detailed status info
          // So we'll try with cors mode first, and it might fail if CORS isn't enabled on the server
          cache: "no-store",
        });

        if (!response.ok) {
          return {
            isValid: false,
            isValidating: false,
            error: `HTTP error: ${response.status}`,
          };
        }

        // Check content type if available
        const contentType = response.headers.get("content-type");
        if (contentType) {
          const isJavaScript =
            contentType.includes("javascript") ||
            contentType.includes("application/ecmascript") ||
            contentType.includes("text/ecmascript") ||
            contentType.includes("module") ||
            contentType.includes("json") || // For import maps
            (contentType.includes("text/plain") && url.endsWith(".js"));

          if (!isJavaScript) {
            return {
              isValid: false,
              isValidating: false,
              error: `Not a JavaScript file: ${contentType}`,
            };
          }
        }

        return { isValid: true, isValidating: false };
      } catch (error) {
        return {
          isValid: false,
          isValidating: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    []
  );

  // Debounced validation function for input changes
  const debouncedValidate = useDebounce(
    async (moduleName: string, value: string) => {
      // Set validating state
      setEditStates((prev) => ({
        ...prev,
        [moduleName]: {
          ...prev[moduleName],
          validation: { ...prev[moduleName].validation, isValidating: true },
        },
      }));

      // Validate URL
      const validationResult = await validateModuleUrl(value);

      // Update state with validation result
      setEditStates((prev) => ({
        ...prev,
        [moduleName]: {
          ...prev[moduleName],
          validation: validationResult,
        },
      }));
    },
    800
  );

  // Validate all module URLs when component mounts or modules change
  useEffect(() => {
    // Collect all modules that need validation
    const modulesToValidate = modules.filter((module) => {
      const currentUrl = module.overrideUrl || module.originalUrl;
      const currentState = editStates[module.moduleName];

      // Skip if already validating this URL or if we already have a valid result for this exact URL
      return !(
        currentState?.validation?.isValidating ||
        (currentState?.validation?.isValid !== null &&
          currentState?.value === currentUrl)
      );
    });

    if (modulesToValidate.length === 0) {
      return;
    }

    // Set all modules to validating state
    const updatedEditStates = { ...editStates };
    modulesToValidate.forEach((module) => {
      const currentUrl = module.overrideUrl || module.originalUrl;
      updatedEditStates[module.moduleName] = {
        ...updatedEditStates[module.moduleName],
        validation: {
          ...(updatedEditStates[module.moduleName]?.validation || {}),
          isValidating: true,
        },
      };
    });
    setEditStates(updatedEditStates);

    // Validate all URLs in parallel
    const validationPromises = modulesToValidate.map(async (module) => {
      const currentUrl = module.overrideUrl || module.originalUrl;
      const validationResult = await validateModuleUrl(currentUrl);

      // Update each module's validation status as it completes
      setEditStates((prev) => ({
        ...prev,
        [module.moduleName]: {
          ...prev[module.moduleName],
          validation: validationResult,
        },
      }));

      return { moduleName: module.moduleName, result: validationResult };
    });

    // We don't need to wait for all promises to resolve in the useEffect
    // as each one will update the state individually when it completes
    Promise.all(validationPromises).catch((error) => {
      console.error("Error during parallel validation:", error);
    });
  }, [modules, editStates, validateModuleUrl]);

  // Function to manually trigger validation for a module
  const handleManualValidation = useCallback(
    async (moduleName: string) => {
      const moduleState = editStates[moduleName];
      if (moduleState) {
        // Set validating state
        setEditStates((prev) => ({
          ...prev,
          [moduleName]: {
            ...prev[moduleName],
            validation: { ...prev[moduleName].validation, isValidating: true },
          },
        }));

        // Validate URL directly (no debounce for manual validation)
        const validationResult = await validateModuleUrl(moduleState.value);

        // Update state with validation result
        setEditStates((prev) => ({
          ...prev,
          [moduleName]: {
            ...prev[moduleName],
            validation: validationResult,
          },
        }));
      }
    },
    [editStates, validateModuleUrl]
  );

  // Initialize edit states for all modules
  useEffect(() => {
    const newEditStates: Record<
      string,
      {
        value: string;
        isEditing: boolean;
        isSaving: boolean;
        saveSuccess: boolean | null;
        validation: ValidationStatus;
      }
    > = {};
    modules.forEach((module) => {
      if (!editStates[module.moduleName]) {
        newEditStates[module.moduleName] = {
          value: module.overrideUrl || module.originalUrl,
          isEditing: false,
          isSaving: false,
          saveSuccess: null,
          validation: { isValid: null, isValidating: false },
        };
      }
    });
    if (Object.keys(newEditStates).length > 0) {
      setEditStates((prev) => ({ ...prev, ...newEditStates }));
    }
  }, [modules]);

  // Save handler with feedback
  const handleSave = useCallback(
    (moduleName: string, value: string) => {
      setEditStates((prev) => ({
        ...prev,
        [moduleName]: {
          ...prev[moduleName],
          isSaving: true,
          saveSuccess: null,
        },
      }));

      onSave(moduleName, value);

      // Show success status
      setTimeout(() => {
        setEditStates((prev) => ({
          ...prev,
          [moduleName]: {
            ...prev[moduleName],
            isSaving: false,
            saveSuccess: true,
          },
        }));

        // Clear success status after 2 seconds
        setTimeout(() => {
          setEditStates((prev) => ({
            ...prev,
            [moduleName]: {
              ...prev[moduleName],
              saveSuccess: null,
            },
          }));
        }, 2000);
      }, 500);
    },
    [onSave]
  );

  // Create debounced save function
  const debouncedSave = useDebounce((moduleName: string, value: string) => {
    handleSave(moduleName, value);
  }, 800);

  const handleInputChange = (moduleName: string, value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        value,
        saveSuccess: null,
      },
    }));
    debouncedSave(moduleName, value);
    debouncedValidate(moduleName, value);
  };

  const handleInputFocus = (moduleName: string) => {
    setEditStates((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        isEditing: true,
      },
    }));
  };

  const handleInputBlur = (moduleName: string) => {
    setEditStates((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        isEditing: false,
      },
    }));
  };

  // Toggle popover open/close
  const togglePopover = (moduleId: string) => {
    setOpenPopoverId((prevId) => (prevId === moduleId ? null : moduleId));
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openPopoverId &&
        !(event.target as Element).closest(".override-popover")
      ) {
        setOpenPopoverId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPopoverId]);

  // Handler for applying a previous override
  const handleApplyPreviousOverride = useCallback(
    (moduleName: string, url: string) => {
      // Update the edit state first so UI reflects the change immediately
      setEditStates((prev) => ({
        ...prev,
        [moduleName]: {
          ...prev[moduleName],
          value: url,
          saveSuccess: null,
        },
      }));

      // Then save the change
      handleSave(moduleName, url);
      setOpenPopoverId(null); // Close popover after applying

      // Also validate the URL
      debouncedValidate(moduleName, url);
    },
    [handleSave, debouncedValidate]
  );

  // Handler for resetting a module override
  const handleReset = useCallback(
    (moduleName: string) => {
      // Find the module
      const module = modules.find((m) => m.moduleName === moduleName);
      if (module) {
        // Update the edit state to show the original URL
        setEditStates((prev) => ({
          ...prev,
          [moduleName]: {
            ...prev[moduleName],
            value: module.originalUrl,
            saveSuccess: null,
            validation: { isValid: null, isValidating: false },
          },
        }));

        // Then reset the override
        onReset(moduleName);

        // Validate the original URL
        debouncedValidate(moduleName, module.originalUrl);
      }
    },
    [modules, onReset, debouncedValidate]
  );

  // Format the relative time for display
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 10) return `${seconds}s ago`;
    return "Just now";
  };

  // Get available overrides for a module (history for this module)
  const getAvailableOverrides = (
    module: ImportMapModule
  ): OverrideHistoryEntry[] => {
    const moduleHistory = moduleOverrideHistory[module.moduleName] || [];

    // Filter out the current override URL if it exists
    return moduleHistory.filter((entry) => entry.url !== module.overrideUrl);
  };

  if (modules.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        No modules found. Make sure you have an import map on this page.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {modules.map((module, index) => {
        const editState = editStates[module.moduleName] || {
          value: module.overrideUrl || module.originalUrl,
          isEditing: false,
          isSaving: false,
          saveSuccess: null,
          validation: { isValid: null, isValidating: false },
        };

        const isOverridden = !!module.overrideUrl;
        const isDirty =
          editState.value !== (module.overrideUrl || module.originalUrl);

        // Get available overrides for this module
        const availableOverrides = getAvailableOverrides(module);
        const hasOverrideHistory = availableOverrides.length > 0;
        const popoverId = `popover-${module.moduleName}`;
        const isPopoverOpen = openPopoverId === popoverId;

        return (
          <div
            key={module.moduleName}
            className={`p-4 rounded-lg border shadow-sm hover:shadow transition-all duration-200 ${
              isOverridden
                ? "border-indigo-300 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            } animate-in slide-in-from-bottom duration-300`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 break-all text-base">
                  {module.moduleName}
                </h3>
                <div className="flex gap-2 flex-shrink-0">
                  {editState.isSaving && (
                    <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-3 w-3"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </span>
                  )}
                  {editState.saveSuccess && (
                    <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                      <svg
                        className="h-3 w-3 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                      Saved
                    </span>
                  )}
                  {hasOverrideHistory && (
                    <div className="relative override-popover">
                      <Button
                        onClick={() => togglePopover(popoverId)}
                        variant="outline"
                        size="sm"
                        title="View override history"
                        aria-expanded={isPopoverOpen}
                        aria-controls={popoverId}
                        className={`text-xs py-1 px-2 h-auto font-normal ${
                          isPopoverOpen
                            ? "bg-indigo-200 text-indigo-800 border-indigo-300 hover:bg-indigo-200/90 dark:bg-indigo-800/60 dark:text-indigo-200 dark:border-indigo-700"
                            : "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 hover:text-white dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/30 dark:hover:bg-indigo-800/60 dark:hover:text-white"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        History
                      </Button>
                      {isPopoverOpen && (
                        <div
                          id={popoverId}
                          className="override-popover absolute right-0 top-full mt-1 w-auto p-2 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 z-10 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                            Override history for this module:
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {availableOverrides.map((entry, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  handleApplyPreviousOverride(
                                    module.moduleName,
                                    entry.url
                                  )
                                }
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 mb-1 last:mb-0 flex items-center font-mono truncate text-slate-700 dark:text-slate-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 mr-1.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <div className="flex-1 flex justify-between items-center min-w-0">
                                  <span className="truncate mr-1.5">
                                    {entry.url}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 text-[10px] whitespace-nowrap">
                                    {formatRelativeTime(entry.timestamp)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {isOverridden && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReset(module.moduleName)}
                      className="text-xs py-1 px-2 h-auto font-normal"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative group">
                <Input
                  value={editState.value}
                  onChange={(e) =>
                    handleInputChange(module.moduleName, e.target.value)
                  }
                  onFocus={() => handleInputFocus(module.moduleName)}
                  onBlur={() => handleInputBlur(module.moduleName)}
                  spellCheck="false"
                  autoComplete="off"
                  className={`w-full font-mono text-sm transition-all ${
                    isOverridden
                      ? "bg-white/70 dark:bg-slate-700/70 border-indigo-200 dark:border-indigo-800"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  } ${
                    editState.isEditing
                      ? "pl-4 ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-sm"
                      : ""
                  }`}
                />

                {isDirty && !editState.isSaving && !editState.saveSuccess && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 dark:text-amber-400">
                    <span className="animate-pulse">●</span>
                  </div>
                )}

                {editState.validation.isValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>

              {/* Validation status row */}
              <div className="flex items-center mt-1 text-xs h-5">
                {editState.validation.isValidating && (
                  <div className="flex items-center text-blue-500">
                    <svg
                      className="animate-spin h-3 w-3 mr-1.5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Validating URL...
                  </div>
                )}

                {editState.validation.isValid === true &&
                  !editState.validation.isValidating && (
                    <div className="flex items-center text-emerald-500 dark:text-emerald-400">
                      <svg
                        className="h-3 w-3 mr-1.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                      URL is valid and accessible
                    </div>
                  )}

                {editState.validation.isValid === false &&
                  !editState.validation.isValidating && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center text-red-500 dark:text-red-400">
                        <svg
                          className="h-3 w-3 mr-1.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        {editState.validation.error || "URL is invalid"}
                      </div>
                      <button
                        onClick={() =>
                          handleManualValidation(module.moduleName)
                        }
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Retry validation"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                {editState.validation.isValid === null &&
                  !editState.validation.isValidating && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center text-slate-400 dark:text-slate-500">
                        <svg
                          className="h-3 w-3 mr-1.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        URL not validated yet
                      </div>
                      <button
                        onClick={() =>
                          handleManualValidation(module.moduleName)
                        }
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Start validation"
                      >
                        Validate
                      </button>
                    </div>
                  )}
              </div>

              {isOverridden && (
                <div className="text-xs text-slate-500 dark:text-slate-500 break-all line-through mt-1">
                  <span className="inline-block mr-1 not-italic text-slate-400 dark:text-slate-500 no-underline">
                    Original:
                  </span>
                  {module.originalUrl}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* We can remove the tooltip styles as they're no longer needed */}
      <style>
        {`
          /* Empty style block - previously had tooltip styles */
        `}
      </style>
    </div>
  );
}
