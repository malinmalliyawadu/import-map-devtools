# Import Map Devtools

A modern UI for overriding import maps in the browser, built with React, Tailwind CSS, and Shadcn UI.

## About

Import Map Devtools is a modern UI for the [import-map-overrides](https://github.com/single-spa/import-map-overrides) concept, focusing on providing a beautiful, user-friendly interface for developers to override import maps during development.

Import maps are a web standard that allow you to control how the browser resolves JavaScript module specifiers. The Import Map Devtools library makes it easy to override these mappings, helping you develop and debug microfrontend applications without needing to set up complex local environments.

## Features

- 🎨 Modern UI built with React and Tailwind CSS
- 💾 Persists overrides in localStorage for convenience
- 🔍 Filter and search through modules
- 📋 Edit module URLs with a convenient dialog
- 🔄 Reset individual or all overrides
- 📱 Responsive design that works on all devices
- ⚡️ Loader script to ensure overrides are applied before import maps are processed

## Usage

### Installation

```bash
npm install import-map-devtools
```

### Loader Script (Important!)

For import map overrides to work correctly, you **must** include the loader script **before** any import maps in your HTML:

1. Copy the loader script from node_modules to your web server's public directory:

```bash
cp node_modules/import-map-devtools/dist/loader.global.js public/
```

2. Include the script in your HTML before any import maps:

```html
<!-- Import Map Devtools Loader - include BEFORE import maps -->
<script src="/loader.global.js"></script>

<!-- Your import maps come after the loader -->
<script type="importmap">
  {
    "imports": {
      "react": "https://cdn.example.com/react.js"
    }
  }
</script>
```

This is crucial because browsers process import maps immediately when they're encountered. The loader script ensures your overrides are applied before the browser processes the import maps.

### UI Component

Add the `ImportMapDevtools` component to your application:

```jsx
import { ImportMapDevtools } from "import-map-devtools";

function App() {
  return (
    <div>
      {/* Your app content */}
      <ImportMapDevtools />
    </div>
  );
}
```

### Configuration Options

The `ImportMapDevtools` component accepts the following props:

```jsx
<ImportMapDevtools
  buttonPosition="bottom-right" // "top-left", "top-right", "bottom-left", "bottom-right"
  buttonText="Import Map" // Custom button text
  className="" // Additional CSS classes for the button
/>
```

## Development

This project uses a monorepo structure:

- `packages/import-map-devtools`: The core library
- `packages/example`: An example app to demonstrate functionality

### Setup

```bash
# Install dependencies
npm install

# Start the example app
npm run dev

# Build the library
npm run build
```

## License

MIT
