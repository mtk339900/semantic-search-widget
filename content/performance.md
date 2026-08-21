# Performance

Nova.js is designed for speed out of the box, but as your application grows, you may need to apply targeted optimizations. This guide covers lazy loading, code splitting, rendering optimization, and profiling techniques.

## Performance Fundamentals

Before optimizing, understand the key metrics that matter:

- **Largest Contentful Paint (LCP)** — Time until the main content is visible. Target: < 2.5 seconds.
- **First Input Delay (FID)** — Time from first user interaction to browser response. Target: < 100 milliseconds.
- **Cumulative Layout Shift (CLS)** — Visual stability of the page. Target: < 0.1.
- **Time to Interactive (TTI)** — Time until the page is fully interactive. Target: < 3.5 seconds.

Run a baseline audit before making changes:

```bash
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

## Lazy Loading Components

Defer loading non-critical components until they're needed. This reduces the initial JavaScript bundle size.

### Using defineAsyncComponent

```javascript
import { component, html, defineAsyncComponent } from 'nova'

const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart'),
  loadingComponent: html`<div class="skeleton">Loading chart...</div>`,
  errorComponent: html`<div class="error">Failed to load chart</div>`,
  delay: 200,       // Show loading component after 200ms
  timeout: 10000,   // Fail after 10 seconds
})

export default component({
  name: 'Dashboard',
  render() {
    return html`
      <div>
        <h1>Dashboard</h1>
        <p>This content loads immediately.</p>
        <${HeavyChart} />
      </div>
    `
  },
})
```

### Intersection Observer Lazy Loading

Load components only when they scroll into view:

```javascript
import { component, html, defineAsyncComponent, useIntersectionObserver } from 'nova'

const BelowFoldContent = defineAsyncComponent({
  loader: () => import('./BelowFoldContent'),
})

export default component({
  name: 'HomePage',

  setup() {
    const shouldLoad = state(false)
    const { observe } = useIntersectionObserver((entry) => {
      if (entry.isIntersecting) {
        shouldLoad.value = true
      }
    }, { threshold: 0.1 })

    return { shouldLoad, observe }
  },

  render({ shouldLoad, observe }) {
    return html`
      <div>
        <header>Hero content loads immediately</header>
        <div ref=${observe}>
          ${shouldLoad.value
            ? html`<${BelowFoldContent} />`
            : html`<div class="placeholder" style="height:500px">Loading...</div>`}
        </div>
      </div>
    `
  },
})
```

## Code Splitting

Nova.js automatically code-splits based on routes. Each route's JavaScript is loaded only when the user navigates to it.

### Manual Code Splitting

For non-route code, use dynamic `import()`:

```javascript
// Instead of:
import { formatCurrency } from './utils/formatters'

// Use:
function useFormatter() {
  return import('./utils/formatters').then(m => m.formatCurrency)
}

// Usage in async context
async function displayPrice(amount) {
  const formatCurrency = await useFormatter()
  return formatCurrency(amount)
}
```

### Prefetching Strategy

Configure when Nova.js prefetches route chunks:

```javascript
// nova.config.js
export default {
  prefetch: {
    // Prefetch on link hover (default: true)
    onHover: true,

    // Prefetch when link enters viewport
    onViewport: true,

    // Maximum concurrent prefetch requests
    concurrency: 3,
  },
}
```

## Rendering Optimization

### Virtual Scrolling

For lists with thousands of items, use virtual scrolling to render only visible rows:

```javascript
import { component, html, useVirtualList } from 'nova'

export default component({
  name: 'LargeList',

  setup() {
    const allItems = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      text: `Item ${i}`,
    }))

    const { containerRef, visibleItems, containerStyle } = useVirtualList({
      items: allItems,
      itemHeight: 40,
      overscan: 5,
    })

    return { containerRef, visibleItems, containerStyle }
  },

  render({ containerRef, visibleItems, containerStyle }) {
    return html`
      <div ref=${containerRef} style=${containerStyle} class="virtual-list">
        ${visibleItems.value.map(item => html`
          <div class="list-item" style="height:40px">${item.text}</div>
        `)}
      </div>
    `
  },
})
```

### Memoization

Prevent unnecessary re-computation and re-rendering:

```javascript
import { component, html, state, computed, memo } from 'nova'

export default component({
  name: 'ExpensiveList',

  setup() {
    const items = state([...largeDataSet])
    const filter = state('')

    // Computed automatically caches until dependencies change
    const filteredItems = computed(() => {
      return items.value
        .filter(item => item.name.includes(filter.value))
        .sort((a, b) => a.name.localeCompare(b.name))
    })

    return { filter, filteredItems }
  },

  render({ filter, filteredItems }) {
    return html`
      <div>
        <input type="text" .value=${filter.value} @input=${e => filter.value = e.target.value} />
        <ul>
          ${filteredItems.value.map(item => html`
            <li key=${item.id}>${item.name}</li>
          `)}
        </ul>
      </div>
    `
  },
})
```

### List Key Optimization

Always use unique, stable keys for list items. Avoid using array indices as keys when the list can be reordered:

```javascript
// Bad — index as key causes unnecessary DOM operations
${items.map((item, index) => html`<li key=${index}>${item.name}</li>`)}

// Good — stable unique identifier
${items.map(item => html`<li key=${item.id}>${item.name}</li>`)}
```

## Image Optimization

### Responsive Images

```javascript
import { Image } from 'nova'

export default component({
  name: 'HeroSection',
  render() {
    return html`
      <${Image}
        src="/hero.jpg"
        alt="Hero image"
        width={1200}
        height={600}
        sizes="(max-width: 768px) 100vw, 1200px"
        placeholder="blur"
        loading="eager"
      />
    `
  },
})
```

### Lazy Loading Images

Off-screen images load automatically when they approach the viewport:

```javascript
<${Image}
  src="/large-photo.jpg"
  alt="Gallery photo"
  loading="lazy"
  decoding="async"
/>
```

## Bundle Analysis

### Analyzing Bundle Size

```bash
# Generate a visual bundle analysis
npm run build -- --analyze
```

This opens an interactive treemap showing the size of every module in your bundle. Look for unexpectedly large dependencies and consider alternatives.

### Identifying Large Dependencies

Common culprits and their lighter alternatives:

| Heavy Library | Size | Lighter Alternative | Size |
|---------------|------|---------------------|------|
| moment.js | 67 KB | date-fns | 7 KB |
| lodash | 72 KB | lodash-es (tree-shake) | varies |
| uuid | 12 KB | crypto.randomUUID() | 0 KB |

### Tree Shaking Verification

Ensure unused exports are removed:

```bash
# Build and check the output
npm run build
npx bundle-stats dist/client/*.js
```

## Profiling

### DevTools Profiler

Nova.js integrates with the browser's Performance DevTools:

1. Open Chrome DevTools → Performance tab
2. Click "Record"
3. Interact with your application
4. Stop recording
5. Look for long tasks and unnecessary re-renders

### Component Render Tracing

Enable render tracing in development:

```javascript
// nova.config.js
export default {
  devtools: {
    renderTracing: true,
    trackUpdates: true,
  },
}
```

This logs component render counts and timing to the console, helping you identify components that re-render too frequently.

### Memory Leak Detection

Use Chrome DevTools Memory tab to detect leaks:

1. Take a heap snapshot
2. Navigate through your app
3. Take another snapshot
4. Compare snapshots to find detached DOM nodes or retained closures

## Server-Side Performance

### Response Caching

```javascript
// nova.config.js
export default {
  cache: {
    api: {
      '/api/products': {
        ttl: 300,       // Cache for 5 minutes
        staleWhileRevalidate: 3600,
      },
    },
  },
}
```

### Compression

Nova.js enables gzip compression by default in production. Enable Brotli for additional savings:

```javascript
export default {
  server: {
    compression: {
      gzip: true,
      brotli: true,
    },
  },
}
```