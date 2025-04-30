import React, { useState, useEffect, useRef, useCallback } from "react";
import { ImportMapModule } from "../services/import-map";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Custom debounce function
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

interface ModuleListProps {
  modules: ImportMapModule[];
  onReset: (moduleName: string) => void;
  onSave: (moduleName: string, url: string) => void;
}

export function ModuleList({ modules, onReset, onSave }: ModuleListProps) {
  const [editStates, setEditStates] = useState<
    Record<
      string,
      {
        value: string;
        isEditing: boolean;
        isSaving: boolean;
        saveSuccess: boolean | null;
      }
    >
  >({});

  // Initialize edit states for all modules
  useEffect(() => {
    const newEditStates: Record<string, any> = {};
    modules.forEach((module) => {
      if (!editStates[module.moduleName]) {
        newEditStates[module.moduleName] = {
          value: module.overrideUrl || module.originalUrl,
          isEditing: false,
          isSaving: false,
          saveSuccess: null,
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
  const debouncedSave = useDebounce(handleSave, 800);

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
        };

        const isOverridden = !!module.overrideUrl;
        const isDirty =
          editState.value !== (module.overrideUrl || module.originalUrl);

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
                  {isOverridden && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onReset(module.moduleName)}
                      className="font-medium"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative group">
                {editState.isEditing && (
                  <div className="absolute left-0 -ml-2 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                )}
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
    </div>
  );
}
