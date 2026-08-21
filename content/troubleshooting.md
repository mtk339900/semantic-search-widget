# Troubleshooting

This guide covers common errors, debugging techniques, frequently asked questions, and known issues in Nova.js. If you're experiencing a problem, start here before searching GitHub issues or asking in the community.

## Common Errors

### Module Not Found

**Error message:**
```
Error: Cannot find module '@/components/Button'
  at Object.<anonymous> (src/routes/index.js:3:18)
```

**Cause:** The `@` alias is not configured, or the path is incorrect.

**Solution:** Verify your alias configuration in `nova.config.js`:

```javascript
import { resolve } from 'path'

export default {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}
```

Also check that the file exists at the expected path. Note that the alias points to the `src` directory, so `@/components/Button` resolves to `src/components/Button`.

### Hydration Mismatch

**Error message:**
```
[Nova Warn] Hydration mismatch: The server-rendered HTML does not match the client.
Element: <div class="user-card">
```

**Cause:** The HTML produced during server-side rendering differs from what the client generates. Common reasons include:

1. Using `Date.now()` or `Math.random()` directly in templates
2. Accessing `window` or `localStorage` during render
3. Conditional rendering based on browser-specific APIs
4. Third-party libraries that modify the DOM on import

**Solution:** Move non-deterministic values to `onMount` or use `isClient` guard:

```javascript
import { component, html, onMount, isClient, state } from 'nova'

export default component({
  name: 'Clock',

  setup() {
    const time = state('')

    onMount(() => {
      time.value = new Date().toLocaleTimeString()
    })

    return { time, isClient }
  },

  render({ time, isClient }) {
    return html`
      <div>
        ${isClient ? html`<span>${time.value}</span>` : html`<span>--:--:--</span>`}
      </div>
    `
  },
})
```

### Port Already in Use

**Error message:**
```
Error: Port 3000 is already in use. Use --port to specify a different port.
```

**Cause:** Another process (possibly a previous dev server) is using port 3000.

**Solutions:**

```bash
# Option 1: Use a different port
nova dev --port 3001

# Option 2: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
npx kill-port 3000              # Cross-platform
```

## Authentication Issues

### Login Not Working

If clicking the sign-in button doesn't appear to do anything, or you see a generic failure message after submitting your credentials, check the following:

1. **API endpoint is reachable** — Open your browser's Network tab and verify that the login request is being sent and returns a response. If the request fails with a network error, the backend API server may not be running.

2. **CORS headers** — If your Nova.js app runs on `localhost:3000` and your API runs on `localhost:8080`, the API must include CORS headers:
   ```http
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Credentials: true
   ```

3. **Request payload format** — Ensure the login request body matches what the API expects. Nova.js sends JSON by default:
   ```javascript
   // Verify the request format
   console.log({ email: email.value, password: password.value })
   ```

### Session Expired Unexpectedly

If users are being logged out before the configured session duration:

1. **Clock skew** — Server and client clocks must be synchronized for JWT token expiry validation. A 5-minute clock difference can cause tokens to be rejected.

2. **Token refresh failing silently** — Check the Network tab for failed refresh token requests. The refresh token endpoint may be returning 401 instead of issuing new tokens.

3. **Cookie domain mismatch** — If using cookies for token storage, ensure the cookie domain matches your application's domain. A cookie set for `.example.com` won't be sent to `app.example.com`.

4. **Browser storage limits** — If localStorage is full, the token write may fail silently. Check `localStorage.getItem('nova_auth_token')` in the console.

### Authentication Redirect Loop

If the user is stuck in a loop between the login page and the protected page:

1. **Guard returns redirect for authenticated users** — Ensure your route guard checks `auth.isAuthenticated` correctly and doesn't redirect logged-in users away from the target page.

2. **Login success redirects to a guarded route** — If the login success handler redirects to `/dashboard` but the dashboard guard doesn't recognize the session yet, you'll loop. Add a short delay or use the `onLoginSuccess` callback:
   ```javascript
   novaAuth({
     onLoginSuccess: async (user) => {
       // Wait for session to be fully established
       await auth.refetchSession()
       navigate('/dashboard')
     },
   })
   ```

### OAuth Sign-In Fails

Common issues with Google, GitHub, or other social login providers:

1. **Redirect URI mismatch** — The OAuth provider requires an exact match for the callback URL. Ensure the URL registered in the provider's console (e.g., Google Cloud Console) matches `http://localhost:3000/auth/callback` in development.

2. **Missing client secrets in environment variables** — Verify that `NOVA_GOOGLE_CLIENT_ID` and `NOVA_GOOGLE_CLIENT_SECRET` are set in your `.env` file.

3. **Popup blocked** — Some OAuth flows open a popup window. Ensure your browser isn't blocking popups for your development origin.

### Signup / Registration Errors

If new account creation fails:

- **Duplicate email** — The API should return a specific error code (e.g., `EMAIL_TAKEN`). If you see a generic 500 error, the API may not be handling uniqueness constraints properly.

- **Password validation** — If the signup form isn't enforcing password requirements, check both client-side validation (`minlength` attribute) and server-side validation.

- **Missing required fields** — Ensure the signup request includes all required fields expected by your API endpoint.

## Build Errors

### JavaScript Heap Out of Memory

**Error message:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:** Increase Node.js memory limit:

```bash
# macOS / Linux
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Windows (PowerShell)
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Permanent fix in package.json
# { "scripts": { "build": "node --max-old-space-size=4096 ./node_modules/.bin/nova build" } }
```

### Build Stalls or Hangs

If the build process appears to freeze:

1. **Circular dependencies** — Check for circular imports between modules. Nova.js's bundler will warn about circular dependencies, but in some cases they can cause the bundler to hang.

2. **Large static assets** — Very large images or files in the `public/` directory can slow down the build. Move them to external storage and reference them by URL.

3. **Source map generation** — Disabling source maps can significantly speed up the build:
   ```javascript
   export default { build: { sourcemap: false } }
   ```

## Debugging Tips

### Using the Nova DevTools

Install the Nova.js DevTools browser extension for real-time component inspection:

```bash
npm install -D @nova-js/devtools
```

Features include:

- **Component tree inspector** — See the component hierarchy and current prop/state values
- **Reactivity explorer** — Track reactive dependencies and trigger updates manually
- **Event log** — View all emitted events with their payloads
- **Router inspector** — See current route, params, and navigation history

### Source Maps in Production

Enable source maps for debugging production issues:

```javascript
export default {
  productionSourceMaps: true,
}
```

### Verbose Logging

Enable verbose output from the CLI and runtime:

```bash
nova dev --verbose
NOVA_LOG_LEVEL=debug nova dev
```

### Debug Server-Side Code

Attach a debugger to the Nova.js server:

```bash
node --inspect-brk dist/server/entry.js
```

Then open `chrome://inspect` in Chrome and click "Inspect".

## FAQ

### How do I update Nova.js to the latest version?

```bash
npm update @nova-js/core @nova-js/cli @nova-js/router
```

Then run `nova migrate` to apply any automated migration changes.

### Does Nova.js support Internet Explorer?

No. Nova.js targets modern browsers: Chrome, Firefox, Safari, and Edge (latest 2 versions). IE11 is not supported and will not be supported.

### How do I use Nova.js with an existing Express server?

Nova.js can mount as Express middleware:

```javascript
import express from 'express'
import { createNovaHandler } from 'nova/server'

const app = express()

app.use('/api', apiRouter)
app.use(createNovaHandler({ srcDir: './src' }))

app.listen(3000)
```

### Can I use React components in Nova.js?

Nova.js has its own component model. However, you can use the `@nova-js/compat-react` package to embed React components within Nova.js applications:

```javascript
import { createReactBridge } from '@nova-js/compat-react'
import ReactCounter from './ReactCounter'

const NovaReactCounter = createReactBridge(ReactCounter)
```

### Why is my CSS not applying?

Common CSS issues in Nova.js:

1. **Scoped styles** — If using scoped CSS, ensure you're using standard class selectors rather than element selectors, which can't be scoped reliably.

2. **CSS import order** — Global CSS is loaded before component CSS. If globals have high-specificity selectors, they may override component styles.

3. **CSS modules** — If using CSS modules, import the CSS file and use the class name object:
   ```javascript
   import styles from './Button.module.css'
   // Use: styles.button, styles.primary
   ```

## Known Issues

### Version 3.2.0

- **Issue #2847:** On macOS Sonoma, the development server may not detect file changes when using a ZFS filesystem. Workaround: use APFS or add `--watch-poll` flag.

- **Issue #2831:** The `usePaginatedFetch` composable doesn't reset the page number when the query parameters change. Workaround: call `goToPage(1)` manually in a watcher.

- **Issue #2819:** Brotli compression middleware reports incorrect content-encoding headers when serving files with `.br` extension. Workaround: disable Brotli or rename the files.

### Version 3.1.x

- **Issue #2756:** The `@nova-js/auth` plugin's refresh token rotation can enter an infinite loop if the server clock is significantly ahead of the client clock. This was fixed in 3.2.0.

- **Issue #2702:** Components using `watchEffect` with async callbacks may cause memory leaks if the component unmounts before the async operation completes. Workaround: use an `onDestroy` cleanup with an abort controller.

For a complete list of known issues, visit the [GitHub Issues](https://github.com/nova-js/nova/issues) page and filter by the "bug" label.