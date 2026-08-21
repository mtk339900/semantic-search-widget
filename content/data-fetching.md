# Data Fetching

Nova.js provides a comprehensive data fetching layer that handles API calls, caching, revalidation, pagination, and error handling. This guide covers the built-in `useFetch` hook, the lower-level `useQuery` composable, and server-side data loading patterns.

## The useFetch Hook

The simplest way to fetch data in a Nova.js component is the `useFetch` hook. It handles loading states, errors, and automatic revalidation.

### Basic Usage

```javascript
import { component, html, useFetch } from 'nova'

export default component({
  name: 'PostList',

  setup() {
    const { data, loading, error, refetch } = useFetch('/api/posts')

    return { data, loading, error, refetch }
  },

  render({ data, loading, error, refetch }) {
    if (loading.value) return html`<p>Loading posts...</p>`
    if (error.value) return html`<p>Error: ${error.value.message}</p>`

    return html`
      <div>
        <button @click=${refetch}>Refresh</button>
        <ul>
          ${data.value.map(post => html`
            <li key=${post.id}>${post.title}</li>
          `)}
        </ul>
      </div>
    `
  },
})
```

### POST Requests

```javascript
const { data, loading, error, execute } = useFetch('/api/posts', {
  method: 'POST',
  immediate: false, // Don't fetch on mount
  body: { title: 'My Post', content: 'Hello world' },
  headers: { 'Content-Type': 'application/json' },
})

function handleSubmit() {
  execute()
}
```

## Caching

Nova.js caches fetch results to avoid redundant network requests and improve perceived performance.

### Cache Configuration

```javascript
const { data } = useFetch('/api/users', {
  cache: {
    key: 'users-list',          // Custom cache key
    ttl: 60 * 1000,             // Cache for 60 seconds
    staleWhileRevalidate: true,  // Serve stale data while revalidating
  },
})
```

### Cache Invalidation

Manually invalidate cache entries when you know data has changed:

```javascript
import { invalidateCache, invalidatePattern } from 'nova'

// Invalidate a specific cache key
await invalidateCache('users-list')

// Invalidate all caches matching a pattern
await invalidatePattern('/api/users/*')

// Invalidate everything
await invalidatePattern('*')
```

### Stale-While-Revalidate

The SWR pattern serves cached data immediately while fetching fresh data in the background:

```javascript
const { data, isStale } = useFetch('/api/dashboard', {
  cache: {
    staleWhileRevalidate: true,
    ttl: 5 * 60 * 1000, // Consider stale after 5 minutes
  },
})

// isStale is true when serving from cache but a refetch is in progress
```

## Pagination

Nova.js includes a `usePaginatedFetch` composable for handling paginated API responses.

### Offset-Based Pagination

```javascript
import { component, html, usePaginatedFetch } from 'nova'

export default component({
  name: 'PaginatedList',

  setup() {
    const { data, loading, error, page, totalPages, nextPage, prevPage, goToPage } =
      usePaginatedFetch('/api/posts', {
        pageSize: 20,
      })

    return { data, loading, error, page, totalPages, nextPage, prevPage, goToPage }
  },

  render({ data, loading, page, totalPages, nextPage, prevPage, goToPage }) {
    if (loading.value) return html`<div class="spinner">Loading...</div>`

    return html`
      <div>
        <ul>
          ${data.value.map(item => html`<li key=${item.id}>${item.title}</li>`)}
        </ul>
        <div class="pagination">
          <button @click=${prevPage} ?disabled=${page.value <= 1}>Previous</button>
          <span>Page ${page.value} of ${totalPages.value}</span>
          <button @click=${nextPage} ?disabled=${page.value >= totalPages.value}>Next</button>
        </div>
      </div>
    `
  },
})
```

### Cursor-Based Pagination

For APIs that use cursors (like GraphQL or infinite scroll):

```javascript
const { data, loading, fetchMore, hasMore } = useInfiniteFetch('/api/posts', {
  cursorKey: 'after',
  dataKey: 'posts',
})

async function loadMore() {
  await fetchMore({
    after: data.value[data.value.length - 1].cursor,
  })
}
```

### Infinite Scroll Integration

Combine `useInfiniteFetch` with an intersection observer for infinite scroll:

```javascript
import { component, html, useInfiniteFetch, useIntersectionObserver } from 'nova'

export default component({
  name: 'InfiniteFeed',

  setup() {
    const { data, loading, hasMore, fetchMore } = useInfiniteFetch('/api/feed')

    const { observe } = useIntersectionObserver(async (entry) => {
      if (entry.isIntersecting && hasMore.value && !loading.value) {
        await fetchMore()
      }
    })

    return { data, loading, hasMore, observe }
  },

  render({ data, loading, hasMore, observe }) {
    return html`
      <div>
        ${data.value.map(item => html`<article key=${item.id}>${item.content}</article>`)}
        ${hasMore.value && html`
          <div ref=${observe}>${loading.value ? 'Loading...' : ''}</div>
        `}
      </div>
    `
  },
})
```

## Error Handling

### Error Boundaries

Wrap components with error boundaries to gracefully handle fetch failures:

```javascript
import { component, html, ErrorBoundary } from 'nova'

export default component({
  name: 'App',
  render() {
    return html`
      <${ErrorBoundary} fallback=${(error, reset) => html`
        <div class="error-fallback">
          <h3>Something went wrong</h3>
          <p>${error.message}</p>
          <button @click=${reset}>Try Again</button>
        </div>
      `}>
        <${DataComponent} />
      <//>
    `
  },
})
```

### Retry Logic

Configure automatic retries for transient failures:

```javascript
const { data, error } = useFetch('/api/notifications', {
  retry: {
    count: 3,
    delay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    retryOn: [408, 500, 502, 503, 504],
  },
})
```

### Optimistic Updates

Update the UI immediately and roll back if the request fails:

```javascript
import { useFetch } from 'nova'

const { data, execute } = useFetch('/api/posts/1/like', {
  method: 'POST',
  immediate: false,
  optimistic: {
    key: 'post-1',
    update(currentData) {
      return {
        ...currentData,
        likes: currentData.likes + 1,
      }
    },
    rollbackOnError: true,
  },
})
```

## Server-Side Data Loading

### Route Loaders

For server-side rendering, use the `loader` export in route files:

```javascript
// src/routes/posts/[id].js
export async function loader({ params }) {
  const response = await fetch(`https://api.example.com/posts/${params.id}`)
  if (!response.ok) {
    throw new Response('Post not found', { status: 404 })
  }
  const post = await response.json()
  return { post }
}

export default component({
  name: 'PostPage',
  setup({ data }) {
    return { post: data.post }
  },
  render({ post }) {
    return html`<article><h1>${post.title}</h1><p>${post.body}</p></article>`
  },
})
```

### Parallel Data Loading

Load multiple resources in parallel within a single loader:

```javascript
export async function loader({ params }) {
  const [post, comments, author] = await Promise.all([
    fetch(`/api/posts/${params.id}`).then(r => r.json()),
    fetch(`/api/posts/${params.id}/comments`).then(r => r.json()),
    fetch(`/api/users/me`).then(r => r.json()),
  ])

  return { post, comments, author }
}
```

## Request Interceptors

Intercept and modify requests globally:

```javascript
// src/lib/api.js
import { createApiClient } from 'nova'

export const api = createApiClient({
  baseURL: '/api',

  interceptors: {
    request(config) {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      config.headers['X-Request-ID'] = crypto.randomUUID()
      return config
    },

    response(response) {
      if (response.status === 401) {
        window.location.href = '/login'
      }
      return response
    },
  },
})
```

## Prefetching

Nova.js automatically prefetches data for linked pages when the user hovers over a `<Link>` component. Configure this behavior:

```javascript
// nova.config.js
export default {
  prefetch: {
    enabled: true,
    onHover: true,
    onIntersection: true,
    maxPrefetches: 10,
  },
}
```