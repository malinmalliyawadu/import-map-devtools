import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/loader.ts"],
  // The 'iife' format creates a self-executing function that runs as soon as it's loaded
  // tsup outputs this as a '.global.js' file rather than '.iife.js'
  format: ["cjs", "esm", "iife"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  globalName: "ImportMapDevtools",
  esbuildOptions(options) {
    options.banner = {
      js: "// Import Map Devtools - https://github.com/yourusername/import-map-devtools",
    };
  },
});
