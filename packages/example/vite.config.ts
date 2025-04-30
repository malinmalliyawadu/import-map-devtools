import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to copy the loader script to the public directory
const copyLoaderPlugin = () => {
  return {
    name: "copy-loader-plugin",
    buildStart() {
      // Create the public directory if it doesn't exist
      const publicDir = path.resolve(__dirname, "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Source file
      const sourceFile = path.resolve(
        __dirname,
        "../import-map-devtools/dist/loader.global.js"
      );

      // Destination file
      const destFile = path.resolve(publicDir, "loader.global.js");

      try {
        // Check if the source file exists
        if (fs.existsSync(sourceFile)) {
          // Copy the file
          fs.copyFileSync(sourceFile, destFile);
          console.log("Loader script copied to public directory");
        } else {
          console.warn("Loader script not found at:", sourceFile);
        }
      } catch (error) {
        console.error("Error copying loader script:", error);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyLoaderPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Skip the following modules for pre-bundling to let import map handle them
    exclude: ["demo-module-1", "demo-module-2", "demo-module-3"],
  },
  server: {
    headers: {
      // Necessary to allow using modules from different origins
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
    fs: {
      // Allow serving files from one level up (the monorepo root)
      // This makes node_modules accessible in development
      allow: [path.resolve(__dirname, "../..")],
    },
  },
});
