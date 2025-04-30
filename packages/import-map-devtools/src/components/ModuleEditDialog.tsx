import React, { useState, useEffect } from "react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ImportMapModule } from "../services/import-map";

interface ModuleEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  module: ImportMapModule | null;
  onSave: (moduleName: string, url: string) => void;
}

export function ModuleEditDialog({
  isOpen,
  onClose,
  module,
  onSave,
}: ModuleEditDialogProps) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (module) {
      setUrl(module.overrideUrl || module.originalUrl);
    }
  }, [module]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (module) {
      onSave(module.moduleName, url);
      onClose();
    }
  };

  if (!module) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Module: ${module.moduleName}`}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="moduleUrl"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            URL
          </label>
          <Input
            id="moduleUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter module URL"
            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
          />
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Original URL:
            </span>
            <span className="break-all ml-1">{module.originalUrl}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
