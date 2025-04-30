import React from "react";
import { ImportMapModule } from "../services/import-map";
import { Button } from "./ui/button";

interface ModuleListProps {
  modules: ImportMapModule[];
  onEdit: (module: ImportMapModule) => void;
  onReset: (moduleName: string) => void;
}

export function ModuleList({ modules, onEdit, onReset }: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No modules found. Make sure you have an import map on this page.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {modules.map((module, index) => (
        <div
          key={module.moduleName}
          className={`p-4 rounded-lg border shadow-sm hover:shadow transition-all duration-200 ${
            module.overrideUrl
              ? "border-indigo-300 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          } animate-in slide-in-from-bottom duration-300`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-900 dark:text-slate-100 break-all text-base">
                {module.moduleName}
              </h3>
              <div className="mt-2 text-sm">
                <div
                  className={`break-all ${
                    module.overrideUrl
                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {module.overrideUrl || module.originalUrl}
                </div>
                {module.overrideUrl && (
                  <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-500 break-all line-through">
                    <span className="inline-block mr-1 not-italic text-slate-400 dark:text-slate-500 no-underline">
                      Original:
                    </span>
                    {module.originalUrl}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 sm:self-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(module)}
                className="font-medium hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                Edit
              </Button>
              {module.overrideUrl && (
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
        </div>
      ))}
    </div>
  );
}
