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

## Usage

### Installation

```bash
npm install import-map-devtools
```

### Basic Usage

Simply add the `ImportMapDevtools` component to your application:

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
