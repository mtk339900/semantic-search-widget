# Configuration

Nova.js provides a flexible configuration system that lets you customize nearly every aspect of your application. This document covers configuration files, environment variables, CLI flags, and advanced configuration patterns.

## Configuration File

The primary configuration file is `nova.config.js` (or `nova.config.ts` if you're using TypeScript). It should be placed in the root of your project.

### Basic Configuration

```javascript
// nova.config.js
export default {
  // The directory where your source files live
  srcDir: 'src',

  // The output directory for production builds
  outDir: 'dist',

  // Enable source maps in production
  productionSourceMaps: false,

  // The port for the development server
  devServer: {
    port: 3000,
    host: 'localhost',
  },
}
```

### Configuration Options Reference

#### `srcDir`

- **Type**: `string`
- **Default**: `'src'`
- **Description**: Path to the source directory, relative to the project root. All routes, components, stores, and middleware are resolved from this directory.

```javascript
export default {
  srcDir: 'app',
}
```

#### `outDir`

- **Type**: `string`
- **Default**: `'dist'`
- **Description**: The directory where the production build is written.

#### `basePath`

- **Type**: `string`
- **Default**: `'/'`
- **Description**: The base URL path for your application. Use this when deploying to a subdirectory.

```javascript
export default {
  basePath: '/my-app',
}
```

With this configuration, all routes are prefixed with `/my-app`. The home page becomes `/my-app/` and the about page becomes `/my-app/about`.

#### `trailingSlash`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether to add a trailing slash to URLs. When `true`, `/about` redirects to `/about/`.

#### `build`

- **Type**: `object`
- **Description**: Fine-grained control over the build process.

```javascript
export default {
  build: {
    // Target environment
    target: 'es2020',

    // Minification strategy: 'esbuild' | 'terser' | false
    minify: 'esbuild',

    // CSS code splitting
    cssCodeSplit: true,

    // Sourcemap generation
    sourcemap: false,

    // Chunk size warning threshold (in bytes)
    chunkSizeWarningLimit: 500 * 1024, // 500 KB

    // Rollup options for advanced bundling control
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['nova', 'nova-router'],
        },
      },
    },
  },
}
```

## Environment Variables

Nova.js supports environment variables through `.env` files. These files should be placed in your project root.

### Environment File Loading Order

Environment files are loaded in the following order (later files override earlier ones):

1. `.env` — Always loaded
2. `.env.local` — Git-ignored, for local overrides
3. `.env.development` — Loaded in development mode
4. `.env.production` — Loaded during production builds
5. `.env.development.local` — Local development overrides
6. `.env.production.local` — Local production overrides

### Defining Variables

```bash
# .env
NOVA_APP_TITLE=My Application
NOVA_API_BASE=https://api.example.com
NOVA_PUBLIC_URL=https://myapp.com
NOVA_FEATURE_DARK_MODE=true
```

### Accessing Variables in Code

All environment variables prefixed with `NOVA_` are available through the `$env` utility:

```javascript
import { $env } from 'nova'

const apiUrl = $env.NOVA_API_BASE
const title = $env.NOVA_APP_TITLE
```

#### Public vs. Private Variables

Variables prefixed with `NOVA_PUBLIC_` are embedded into the client-side bundle and accessible in the browser. All other variables are server-side only.

```bash
# Public — available in browser code
NOVA_PUBLIC_API_URL=https://api.example.com

# Private — only available on the server
NOVA_DATABASE_URL=postgresql://localhost:5432/mydb
NOVA_SECRET_KEY=s3cr3t
```

### Type Safety for Environment Variables

For TypeScript projects, create a type declaration file:

```typescript
// env.d.ts
interface ImportMetaEnv {
  readonly NOVA_PUBLIC_API_URL: string
  readonly NOVA_APP_TITLE: string
  readonly NOVA_FEATURE_DARK_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## CLI Options

The Nova CLI accepts various flags that override configuration file settings.

### `nova dev`

Start the development server.

```bash
nova dev [options]
```

| Flag | Description | Default |
|------|-------------|----------|
| `--port, -p` | Development server port | 3000 |
| `--host` | Hostname to bind to | localhost |
| `--open, -o` | Open browser automatically | false |
| `--https` | Enable HTTPS | false |
| `--config, -c` | Path to config file | nova.config.js |
| `--strict` | Enable strict mode | false |
| `--filter` | Only build routes matching a glob | — |

Examples:

```bash
# Start on port 4000
nova dev --port 4000

# Start with HTTPS and open browser
nova dev --https --open

# Only work on blog routes
nova dev --filter "**/blog/**"
```

### `nova build`

Create a production build.

```bash
nova build [options]
```

| Flag | Description | Default |
|------|-------------|----------|
| `--mode` | Build mode ('production' or 'staging') | production |
| `--outDir` | Output directory | dist |
| `--analyze` | Generate bundle analysis report | false |
| `--ssr` | Enable server-side rendering | true |
| `--minify` | Minification strategy | esbuild |

### `nova preview`

Preview the production build locally.

```bash
nova preview --port 8080
```

### `nova generate`

Generate type definitions, route manifests, and other artifacts.

```bash
nova generate
```

This command creates:
- `src/generated/routes.d.ts` — Type definitions for all routes
- `src/generated/manifest.json` — Route manifest for the router
- `.nova/types.env.d.ts` — Environment variable types

## Advanced Configuration

### Per-Route Configuration

Export a configuration object from any route file to customize its behavior:

```javascript
// src/routes/admin/dashboard.js

export const config = {
  // This page uses server-side rendering
  render: 'ssr',

  // Custom page title
  title: 'Admin Dashboard',

  // Cache this page for 60 seconds
  cache: {
    maxAge: 60,
    staleWhileRevalidate: 300,
  },

  // Require authentication for this route
  auth: {
    required: true,
    roles: ['admin', 'editor'],
  },
}

export default component({ /* ... */ })
```

### Plugin Configuration

Nova.js uses a plugin system for extending functionality. Configure plugins in your config file:

```javascript
import novaCss from '@nova-js/plugin-css'
import novaPwa from '@nova-js/plugin-pwa'

export default {
  plugins: [
    novaCss({
      postcssPlugins: [
        require('autoprefixer'),
        require('cssnano'),
      ],
    }),
    novaPwa({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My Nova App',
        theme_color: '#6366f1',
      },
    }),
  ],
}
```

### Alias Configuration

Create import path aliases to avoid deep relative imports:

```javascript
import { resolve } from 'path'

export default {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
}
```

Now you can import like this:

```javascript
import Button from '@components/Button'
import { useAuth } from '@stores/auth'
```

### TypeScript Configuration

Nova.js automatically generates a `tsconfig.json` if one doesn't exist. To customize it:

```jsonc
// tsconfig.json
{
  "extends": "./.nova/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.js"]
}
```

### Proxy Configuration for Development

Proxy API requests during development to avoid CORS issues:

```javascript
export default {
  devServer: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}
```

### Strict Mode

Enable strict mode for enhanced development-time checks:

```javascript
export default {
  strict: true,
}
```

Strict mode enables:

- **Prop type validation** — Warnings when props don't match declared types
- **Reactivity warnings** — Alerts for common reactivity anti-patterns
- **Template expression safety** — Prevents XSS by escaping HTML in template expressions
- **Deprecated API warnings** — Alerts when using deprecated framework APIs

## Configuration Merging

When using plugins or presets, configurations are merged using a smart deep-merge strategy. Arrays are concatenated, objects are deep-merged, and primitive values are overridden by the last configuration in the chain.

The merge order is:

1. Default framework configuration
2. Preset configurations (in order of declaration)
3. Plugin configurations (in order of declaration)
4. User's `nova.config.js`
5. CLI flags (highest priority)