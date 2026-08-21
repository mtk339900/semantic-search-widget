# Getting Started with Nova.js

Welcome to Nova.js, a modern, high-performance JavaScript framework for building scalable web applications. This guide will walk you through creating your first Nova.js application from scratch and introduce you to the core concepts that make Nova.js unique.

## Why Nova.js?

Nova.js was designed from the ground up to address the most common pain points in modern web development. Whether you're building a single-page application, a server-rendered site, or a full-stack platform, Nova.js provides the tools and abstractions you need to ship faster without sacrificing quality.

### Key Features

- **Reactive State Management** — Built-in reactivity system with zero boilerplate. No external libraries needed for state synchronization across components.
- **File-Based Routing** — Simply add files to your routes directory and Nova.js automatically generates the routing table. Supports dynamic segments, nested layouts, and catch-all routes.
- **Hybrid Rendering** — Choose per-route rendering strategies: static generation (SSG), server-side rendering (SSR), or client-side rendering (CSR). Mix and match as needed.
- **TypeScript First** — Full TypeScript support out of the box with automatic type inference for routes, props, and API responses.
- **Optimized Build Pipeline** — Powered by Vite under the hood with intelligent code splitting, tree shaking, and asset optimization.

### Who Should Use Nova.js?

Nova.js is ideal for developers who want a batteries-included framework without the complexity of larger alternatives. It strikes a balance between convention and configuration, giving you sensible defaults while remaining fully customizable.

If you're coming from React, Vue, or Angular, you'll find the learning curve gentle. If you're new to frontend frameworks entirely, Nova.js's intuitive API and excellent documentation will help you get productive quickly.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Node.js** version 18.0 or later
- **npm** version 9.0 or later (or **yarn** 1.22+ / **pnpm** 8.0+)
- A code editor with JavaScript/TypeScript support (VS Code recommended)
- A modern web browser for development and testing

You can verify your Node.js installation by running:

```bash
node --version
# v18.17.0 or higher

npm --version
# 9.6.0 or higher
```

## Creating Your First App

The fastest way to create a new Nova.js project is using the official CLI tool, `create-nova`. This interactive scaffolding tool sets up a complete project structure with all the recommended configurations.

```bash
npx create-nova@latest my-nova-app
```

You'll be prompted with a few questions:

```
? Select your project type:
  ❯ Application (full-stack)
    SPA (client-side only)
    Library (reusable components)

? Select your package manager:
  ❯ npm
    yarn
    pnpm

? Do you want to enable TypeScript?
  ❯ Yes
    No

? Select your CSS framework:
  ❯ Nova CSS (built-in)
    Tailwind CSS
    Vanilla CSS
    None
```

After the scaffolding completes, navigate into your new project:

```bash
cd my-nova-app
```

### Project Structure

The generated project follows a clean, opinionated structure:

```
my-nova-app/
├── nova.config.js          # Framework configuration
├── package.json
├── public/
│   ├── favicon.ico
│   └── assets/
├── src/
│   ├── routes/             # File-based routing
│   │   ├── index.js
│   │   └── about.js
│   ├── components/         # Reusable UI components
│   │   └── AppHeader.js
│   ├── stores/             # State management stores
│   ├── middleware/         # Route middleware
│   ├── layouts/            # Page layouts
│   ├── styles/             # Global styles
│   └── app.js              # Application entry point
└── tests/
    ├── unit/
    └── integration/
```

## Writing Your First Page

Let's create a simple home page. Open `src/routes/index.js` and replace its contents:

```javascript
import { component, html, state } from 'nova'

export default component({
  name: 'HomePage',

  setup() {
    const count = state(0)

    function increment() {
      count.value++
    }

    function decrement() {
      count.value--
    }

    return {
      count,
      increment,
      decrement,
    }
  },

  render({ count, increment, decrement }) {
    return html`
      <main class="container">
        <h1>Welcome to Nova.js</h1>
        <p>You clicked the button ${count.value} times.</p>
        <button @click=${increment}>Increment</button>
        <button @click=${decrement}>Decrement</button>
      </main>
    `
  },
})
```

### How This Works

- `component()` defines a new Nova.js component with a name, setup function, and render function.
- `state()` creates a reactive reference. When its value changes, Nova.js automatically re-renders the affected parts of the DOM.
- `html` is a tagged template literal that lets you write HTML-like syntax directly in JavaScript. It handles event binding with the `@` prefix.

## Starting the Development Server

Run the following command to start the development server:

```bash
npm run dev
```

You should see output like this:

```
  Nova.js v3.2.0

  ➜ Local:   http://localhost:3000/
  ➜ Network: http://192.168.1.42:3000/
  ➜ press h + enter to show help
```

Open `http://localhost:3000` in your browser. You should see your new page with the counter working as expected.

### Hot Module Replacement

Nova.js includes hot module replacement (HMR) out of the box. When you save changes to any file in `src/`, the browser updates instantly without a full page reload. State is preserved across HMR updates, so your counter won't reset when you modify the template.

## Adding a Second Page

Create a new file at `src/routes/about.js`:

```javascript
import { component, html } from 'nova'

export default component({
  name: 'AboutPage',

  render() {
    return html`
      <main class="container">
        <h1>About Nova.js</h1>
        <p>
          Nova.js is a modern JavaScript framework for building
          fast, scalable web applications with an emphasis on
          developer experience and performance.
        </p>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </main>
    `
  },
})
```

Nova.js automatically detects the new route file and makes `/about` available. No router configuration needed — just create files and navigate.

## Navigation Between Pages

For client-side navigation (no full page reload), use the built-in `Link` component:

```javascript
import { component, html, Link } from 'nova'

export default component({
  name: 'Navigation',

  render() {
    return html`
      <nav>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </nav>
    `
  },
})
``}

The `Link` component handles prefetching on hover, active state management, and accessible keyboard navigation automatically.

## Understanding the Build Process

When you're ready to build for production, run:

```bash
npm run build
```

This command:

1. **Compiles** all routes and components into optimized JavaScript bundles
2. **Prerenders** pages marked for static generation into HTML files
3. **Generates** a service worker for offline support (if enabled)
4. **Optimizes** all assets — images are compressed, CSS is minified, and JavaScript is tree-shaken

The output goes to the `dist/` directory, ready for deployment to any static hosting provider.

### Previewing the Production Build

To preview the production build locally:

```bash
npm run preview
```

This starts a local server serving from `dist/` so you can verify the production output before deploying.

## Next Steps

Now that you have a basic Nova.js application running, explore these topics to deepen your understanding:

- **[Installation](./installation.md)** — Detailed setup instructions and troubleshooting
- **[Configuration](./configuration.md)** — Customizing Nova.js behavior
- **[Routing](./routing.md)** — Advanced routing patterns and middleware
- **[Components](./components.md)** — Building reusable UI components
- **[State Management](./state-management.md)** — Managing application state at scale

## Getting Help

If you run into any issues:

- Check the [Troubleshooting](./troubleshooting.md) guide for common problems
- Join the [Nova.js Discord community](https://discord.gg/nova-js) for real-time help
- Browse the [GitHub Discussions](https://github.com/nova-js/nova/discussions) for Q&A threads
- Report bugs on the [GitHub Issues](https://github.com/nova-js/nova/issues) tracker

Nova.js is open source and released under the MIT license. Contributions are welcome!
