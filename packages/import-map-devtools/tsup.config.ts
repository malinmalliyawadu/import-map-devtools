import { defineConfig } from "tsup";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs from "fs";
import path from "path";

// Process CSS with PostCSS and Tailwind
async function processCSS() {
  const css = fs.readFileSync(
    path.resolve(__dirname, "src/assets/styles.css"),
    "utf8"
  );
  const result = await postcss([tailwindcss, autoprefixer]).process(css, {
    from: undefined,
  });
  return result.css;
}

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
  async onSuccess() {
    // Process CSS after build
    const css = await processCSS();

    // Create a JavaScript file that injects the CSS
    const injectCSS = `
      if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
      }
    `;

    // Write the CSS injector to a file
    fs.writeFileSync(
      path.resolve(__dirname, "dist/inject-styles.js"),
      injectCSS
    );

    // Update the main entry point to import the CSS injector
    const mainEntry = fs.readFileSync(
      path.resolve(__dirname, "dist/index.js"),
      "utf8"
    );
    fs.writeFileSync(
      path.resolve(__dirname, "dist/index.js"),
      `import './inject-styles.js';\n${mainEntry}`
    );

    // Do the same for the ESM version
    const esmEntry = fs.readFileSync(
      path.resolve(__dirname, "dist/index.mjs"),
      "utf8"
    );
    fs.writeFileSync(
      path.resolve(__dirname, "dist/index.mjs"),
      `import './inject-styles.js';\n${esmEntry}`
    );
  },
  esbuildOptions(options) {
    options.banner = {
      js: "// Import Map Devtools - https://github.com/yourusername/import-map-devtools",
    };
  },
});
