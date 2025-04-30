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
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="moduleUrl"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            URL
          </label>
          <Input
            id="moduleUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter module URL"
            className="w-full"
          />
          <p className="mt-1 text-sm text-gray-500">
            Original URL: {module.originalUrl}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
