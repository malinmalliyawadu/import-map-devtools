// Components
export { ImportMapDevtools } from "./components/ImportMapDevtools";

// Hooks
export { useImportMap } from "./hooks/useImportMap";

// Services
export {
  importMapService,
  ImportMapService,
  type ImportMapModule,
} from "./services/import-map";

/**
 * NOTE: The loader script is built as a separate IIFE (global)
 * and should be included via a script tag in the HTML head
 * before any import maps:
 *
 * <script src="path/to/import-map-devtools/dist/loader.global.js"></script>
 */
