# Routing

Nova.js features a powerful, file-based routing system that automatically generates your application's route table from the file system. This page covers everything from basic routing to advanced patterns like guarded routes, middleware chains, and programmatic navigation.

## File-Based Routing

Routes are defined by the files in your `src/routes/` directory. The file path becomes the URL path:

```
src/routes/
├── index.js              → /
├── about.js              → /about
├── blog/
│   ├── index.js          → /blog
│   └── [slug].js         → /blog/:slug
├── dashboard/
│   ├── layout.js         → Layout wrapper for /dashboard/*
│   ├── index.js          → /dashboard
│   └── settings.js       → /dashboard/settings
└── [...catchAll].js      → Matches all unmatched routes
```

### Route File Exports

Each route file should export a default component. Additionally, you can export optional lifecycle hooks:

```javascript
// src/routes/users/[id].js
import { component, html } from 'nova'

// Runs before the component renders (client and server)
export async function loader({ params }) {
  const response = await fetch(`/api/users/${params.id}`)
  const user = await response.json()
  return { user }
}

// Custom page metadata
export const meta = {
  title: 'User Profile',
  description: 'View user profile and activity',
}

// Rendering strategy for this specific route
export const config = {
  render: 'ssr',
}

export default component({
  name: 'UserPage',

  setup({ data }) {
    // `data` contains the return value from loader()
    return { user: data.user }
  },

  render({ user }) {
    return html`
      <div class="user-page">
        <h1>${user.name}</h1>
        <p>Email: ${user.email}</p>
      </div>
    `
  },
})
```

## Dynamic Routes

### Dynamic Segments

Use square brackets to create dynamic route segments:

```
src/routes/posts/[postId].js     → /posts/123
src/routes/users/[userId]/edit.js → /users/456/edit
```

Access dynamic parameters through the `params` object:

```javascript
export async function loader({ params }) {
  const { postId } = params
  const post = await fetchPost(postId)
  return { post }
}
```

### Catch-All Segments

Use three dots for catch-all (splat) routes:

```
src/routes/docs/[...slug].js    → /docs/getting-started/installation
                                 → /docs/api/reference/component
```

The matched segments are available as an array:

```javascript
export async function loader({ params }) {
  // For /docs/getting-started/installation:
  // params.slug = ['getting-started', 'installation']
  const path = params.slug.join('/')
  const doc = await fetchDoc(path)
  return { doc }
}
```

### Optional Segments

Use double square brackets for optional dynamic segments:

```
src/routes/shop/[category]/[...subcategories].js
```

## Nested Routes and Layouts

Layouts wrap groups of routes with shared UI. Create a `layout.js` file inside any directory:

```javascript
// src/routes/dashboard/layout.js
import { component, html, Link, Outlet } from 'nova'

export default component({
  name: 'DashboardLayout',

  render() {
    return html`
      <div class="dashboard">
        <aside class="sidebar">
          <nav>
            <Link href="/dashboard">Overview</Link>
            <Link href="/dashboard/settings">Settings</Link>
            <Link href="/dashboard/analytics">Analytics</Link>
          </nav>
        </aside>
        <main class="content">
          <Outlet />
        </main>
      </div>
    `
  },
})
```

The `<Outlet />` component renders the child route's content. Layouts can be nested to any depth.

## Middleware

Middleware functions run before a route's loader and component render. They're ideal for authentication checks, redirects, and data prefetching.

### Defining Middleware

Create middleware files in the `src/middleware/` directory:

```javascript
// src/middleware/auth.js
export default function authMiddleware({ redirect, session }) {
  if (!session.user) {
    redirect('/login?from=' + encodeURIComponent(window.location.pathname))
  }
}
```

### Applying Middleware to Routes

```javascript
// src/routes/admin/settings.js
export const middleware = ['auth', 'adminCheck']

export default component({
  name: 'AdminSettings',
  render() {
    return html`<h1>Admin Settings</h1>`
  },
})
```

### Global Middleware

Middleware named `global` or placed in `src/middleware/global.js` runs on every route:

```javascript
// src/middleware/global.js
export default function globalMiddleware({ next, track }) {
  track.pageView()
  next()
}
```

### Middleware Chaining

Middleware runs in the order declared. Each middleware receives a `next()` function to continue the chain:

```javascript
// src/middleware/rateLimit.js
export default function rateLimit({ next, request }) {
  const count = getHitCount(request.ip)
  if (count > 100) {
    throw new Error('Rate limit exceeded')
  }
  next()
}

// src/middleware/logging.js
export default function logging({ next, params, logger }) {
  logger.info(`Navigating to route with params:`, params)
  next()
}
```

## Redirects

### Static Redirects

Define redirects in your configuration:

```javascript
// nova.config.js
export default {
  redirects: {
    '/old-about': '/about',
    '/blog/legacy/:id': '/posts/:id',
  },
}
```

### Programmatic Redirects

Use the `redirect` function in loaders or middleware:

```javascript
import { redirect } from 'nova'

export async function loader({ params }) {
  const post = await fetchPost(params.id)
  if (post.redirectTo) {
    redirect(post.redirectTo, 301)
  }
  return { post }
}
```

### Conditional Redirects

```javascript
export async function loader({ session, params }) {
  if (session.user?.role !== 'admin') {
    redirect('/unauthorized', 403)
  }
  return {}
}
```

## Programmatic Navigation

Beyond the `<Link>` component, you can navigate programmatically:

```javascript
import { navigate, goBack, goForward } from 'nova'

// Navigate to a path
navigate('/dashboard')

// Navigate with state
navigate('/editor', { state: { draftId: 'abc123' } })

// Replace current history entry
navigate('/new-url', { replace: true })

// Browser-like navigation
//
// Go back one entry
// goBack()
//
// Go forward one entry
// goForward()
//
// Go back two entries
// window.history.go(-2)
```

### Navigation Guards

Prevent navigation with the `beforeNavigate` hook:

```javascript
import { beforeNavigate } from 'nova'

beforeNavigate((to, from) => {
  if (to.pathname.startsWith('/checkout') && hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Leave anyway?')
  }
  return true
})
```

## Route Parameters and Query Strings

### Accessing Query Parameters

```javascript
import { useSearchParams } from 'nova'

export default component({
  name: 'SearchPage',

  setup() {
    const searchParams = useSearchParams()
    const query = searchParams.get('q')
    const page = searchParams.get('page') || '1'

    return { query, page }
  },

  render({ query, page }) {
    return html`
      <div>
        <p>Searching for: ${query} (page ${page})</p>
      </div>
    `
  },
})
```

### Updating Query Parameters

```javascript
import { useSearchParams } from 'nova'

export default component({
  name: 'FilterPage',

  setup() {
    const searchParams = useSearchParams()

    function setSortOrder(order) {
      searchParams.set('sort', order)
    }

    function clearFilters() {
      searchParams.clear()
    }

    return { searchParams, setSortOrder, clearFilters }
  },
})
```

## Scroll Behavior

Nova.js restores scroll position on back/forward navigation and scrolls to the top on new navigation. Customize this behavior:

```javascript
// nova.config.js
export default {
  router: {
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      }

      if (to.hash) {
        return { el: to.hash, behavior: 'smooth' }
      }

      return { top: 0, behavior: 'smooth' }
    },
  },
}
```

## Route Loading States

Show a loading indicator while a route's loader is resolving:

```javascript
import { component, html, useRouteLoading } from 'nova'

export default component({
  name: 'App',

  setup() {
    const isLoading = useRouteLoading()
    return { isLoading }
  },

  render({ isLoading }) {
    return html`
      <div>
        ${isLoading
          ? html`<div class="spinner">Loading...</div>`
          : html`<Outlet />`}
      </div>
    `
  },
})
```

## Route Guards

Protect routes based on conditions:

```javascript
// src/routes/profile.js
export const guard = async ({ session }) => {
  if (!session.isAuthenticated) {
    return { redirect: '/login' }
  }
  return { allow: true }
}

export default component({
  name: 'ProfilePage',
  render() {
    return html`<h1>My Profile</h1>`
  },
})
```