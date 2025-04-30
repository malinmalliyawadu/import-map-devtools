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
      {modules.map((module) => (
        <div
          key={module.moduleName}
          className={`p-4 rounded-lg border ${
            module.overrideUrl
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900 break-all">
                {module.moduleName}
              </h3>
              <p className="mt-1 text-sm text-gray-500 break-all">
                {module.overrideUrl || module.originalUrl}
              </p>
              {module.overrideUrl && (
                <p className="mt-1 text-xs text-gray-400 break-all line-through">
                  Original: {module.originalUrl}
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(module)}
              >
                Edit
              </Button>
              {module.overrideUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReset(module.moduleName)}
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
