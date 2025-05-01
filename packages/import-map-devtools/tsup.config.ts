import { defineConfig } from "tsup";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs from "fs";
import path from "path";

// Process CSS with PostCSS and Tailwind
async function processCSS() {
  const css = fs.readFileSync(
    path.resolve(__dirname, "src/styles.css"),
    "utf8"
  );
  const result = await postcss([tailwindcss, autoprefixer]).process(css, {
    from: undefined,
  });
  return result.css;
}

export default defineConfig({
  entry: ["src/index.ts", "src/loader.ts", "src/styles.css"],
  // The 'iife' format creates a self-executing function that runs as soon as it's loaded
  // tsup outputs this as a '.global.js' file rather than '.iife.js'
  format: ["cjs", "esm", "iife"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  globalName: "ImportMapDevtools",
  async onSuccess() {
    // Process CSS after build
    const css = await processCSS();
    fs.writeFileSync(path.resolve(__dirname, "dist/styles.css"), css);
  },
  esbuildOptions(options) {
    options.banner = {
      js: "// Import Map Devtools - https://github.com/yourusername/import-map-devtools",
    };
  },
});
