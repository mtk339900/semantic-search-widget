# Testing

Nova.js provides first-class testing support through Vitest, a fast Vite-native test runner. This guide covers unit tests, integration tests, component testing, mocking, and test configuration.

## Test Setup

### Installing Test Dependencies

```bash
npm install -D vitest @nova-js/test-utils jsdom happy-dom
```

### Vitest Configuration

Create a `vitest.config.js` in your project root:

```javascript
import { defineConfig } from 'vitest/config'
import nova from '@nova-js/vitest'

export default defineConfig({
  plugins: [nova()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/generated/**', 'src/**/*.d.ts'],
    },
  },
})
```

### Test Setup File

```javascript
// tests/setup.js
import { cleanup } from '@nova-js/test-utils'
import { afterEach, vi } from 'vitest'

// Automatically clean up after each test
afterEach(() => {
  cleanup()
})

// Mock browser APIs not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver
```

### NPM Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch"
  }
}
```

## Unit Testing

### Testing Pure Functions

```javascript
// src/utils/formatters.js
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
```

```javascript
// tests/unit/formatters.test.js
import { describe, it, expect } from 'vitest'
import { formatCurrency, truncateText, slugify } from '@/utils/formatters'

describe('formatCurrency', () => {
  it('formats USD amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })

  it('supports different currencies', () => {
    expect(formatCurrency(100, 'EUR')).toContain('€')
  })
})

describe('truncateText', () => {
  it('returns text unchanged when under the limit', () => {
    expect(truncateText('Hello', 10)).toBe('Hello')
  })

  it('truncates long text and adds ellipsis', () => {
    const result = truncateText('A very long text that exceeds the limit', 20)
    expect(result).toBe('A very long text tha...')
    expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
  })

  it('uses default maxLength of 100', () => {
    const short = 'x'.repeat(100)
    expect(truncateText(short)).toBe(short)
    const long = 'x'.repeat(101)
    expect(truncateText(long).endsWith('...')).toBe(true)
  })
})

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('What\'s up?')).toBe('whats-up')
  })

  it('handles multiple spaces', () => {
    expect(slugify('a  b   c')).toBe('a-b-c')
  })

  it('trims leading and trailing dashes', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })
})
```

## Component Testing

### Rendering Components

```javascript
// tests/components/Counter.test.js
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@nova-js/test-utils'
import Counter from '@/components/Counter'

describe('Counter', () => {
  it('renders the initial count', () => {
    render(Counter)
    expect(screen.getByText('Count: 0')).toBeTruthy()
  })

  it('increments when the button is clicked', async () => {
    render(Counter)
    const button = screen.getByText('+')
    await fireEvent.click(button)
    expect(screen.getByText('Count: 1')).toBeTruthy()
  })

  it('decrements when the decrement button is clicked', async () => {
    render(Counter)
    const button = screen.getByText('-')
    await fireEvent.click(button)
    expect(screen.getByText('Count: -1')).toBeTruthy()
  })

  it('renders the correct number of buttons', () => {
    render(Counter)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(3) // +, -, Reset
  })
})
```

### Testing Components with Props

```javascript
// tests/components/UserCard.test.js
import { describe, it, expect } from 'vitest'
import { render, screen } from '@nova-js/test-utils'
import UserCard from '@/components/UserCard'

describe('UserCard', () => {
  const defaultProps = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
  }

  it('displays the user name', () => {
    render(UserCard, { props: defaultProps })
    expect(screen.getByText('Alice Johnson')).toBeTruthy()
  })

  it('displays the user email', () => {
    render(UserCard, { props: defaultProps })
    expect(screen.getByText('alice@example.com')).toBeTruthy()
  })

  it('shows the role badge', () => {
    render(UserCard, { props: defaultProps })
    expect(screen.getByText('admin')).toBeTruthy()
  })

  it('shows default avatar when none provided', () => {
    render(UserCard, { props: defaultProps })
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('/default-avatar.png')
  })

  it('warns on invalid role prop', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    render(UserCard, { props: { ...defaultProps, role: 'superadmin' } })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid prop validation')
    )
    warnSpy.mockRestore()
  })
})
```

## Testing Components with Events

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@nova-js/test-utils'
import SearchInput from '@/components/SearchInput'

describe('SearchInput', () => {
  it('emits search event on input', async () => {
    const onSearch = vi.fn()
    render(SearchInput, { props: { onSearch } })

    const input = screen.getByPlaceholderText('Search...')
    await fireEvent.input(input, { target: { value: 'nova.js' } })

    expect(onSearch).toHaveBeenCalledWith('nova.js')
  })

  it('emits cleared event on clear button click', async () => {
    const onSearch = vi.fn()
    const onCleared = vi.fn()
    render(SearchInput, { props: { onSearch, onCleared } })

    const clearButton = screen.getByText('Clear')
    await fireEvent.click(clearButton)

    expect(onCleared).toHaveBeenCalled()
  })
})
```

## Mocking

### Mocking API Calls

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@nova-js/test-utils'
import UserList from '@/components/UserList'

// Mock the fetch API
const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    })
  )
})

describe('UserList', () => {
  it('displays fetched users', async () => {
    render(UserList)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('Bob')).toBeTruthy()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/users')
  })

  it('shows loading state while fetching', () => {
    // Make fetch hang
    global.fetch = vi.fn(() => new Promise(() => {}))
    render(UserList)
    expect(screen.getByText('Loading users...')).toBeTruthy()
  })

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    )
    render(UserList)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeTruthy()
    })
  })
})
```

### Mocking Modules

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@nova-js/test-utils'
import Dashboard from '@/components/Dashboard'

// Mock an entire module
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { name: 'Test User', role: 'admin' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}))

describe('Dashboard', () => {
  it('renders the user name from the auth store', () => {
    render(Dashboard)
    expect(screen.getByText('Test User')).toBeTruthy()
  })
})
```

## Integration Testing

### Testing Route Navigation

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@nova-js/test-utils'
import { navigate } from 'nova'
import App from '@/App'

describe('Navigation', () => {
  it('navigates between pages using Link components', async () => {
    render(App)

    const aboutLink = screen.getByText('About')
    await fireEvent.click(aboutLink)

    await waitFor(() => {
      expect(screen.getByText('About Nova.js')).toBeTruthy()
    })
  })
})
```

## Test Configuration for CI

```javascript
// vitest.config.ci.js
import { defineConfig } from 'vitest/config'
import nova from '@nova-js/vitest'

export default defineConfig({
  plugins: [nova()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // CI-optimized settings
    pool: 'forks',
    poolOptions: {
      forks: { maxForks: '50%' },
    },
  },
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests once (no watch)
npm run test:run

# Run a specific test file
npx vitest tests/components/Counter.test.js

# Run tests matching a pattern
npx vitest --testNamePattern "formatCurrency"

# Generate coverage report
npm run test:coverage

# Open visual test UI
npm run test:ui
```
