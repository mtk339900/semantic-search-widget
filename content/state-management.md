# State Management

Nova.js includes a built-in state management system designed for simplicity and performance. This guide covers reactive state, stores, computed values, and best practices for managing application data at scale.

## Reactive State

The foundation of Nova.js reactivity is the `state()` function. It creates a reactive reference that automatically triggers UI updates when its value changes.

### Creating Reactive State

```javascript
import { state } from 'nova'

const count = state(0)
const user = state({ name: 'Alice', age: 30 })
const items = state([])
```

### Reading and Writing State

```javascript
// Reading
console.log(count.value) // 0
console.log(user.value.name) // 'Alice'

// Writing
count.value = 5
user.value.name = 'Bob'
```

### Why `.value`?

Nova.js uses a wrapper object to track dependencies and trigger updates. The `.value` property is the unwrapped value. This design is intentional — it makes reactivity explicit and prevents accidental mutations.

### Object and Array Reactivity

Nova.js deeply proxies objects and arrays, so nested mutations are also reactive:

```javascript
const todos = state([
  { id: 1, text: 'Learn Nova.js', done: false },
])

// These mutations are tracked
todos.value[0].done = true
todos.value.push({ id: 2, text: 'Build something', done: false })
```

## Computed Values

Computed values derive their state from other reactive sources. They're automatically cached and only re-evaluate when dependencies change.

### Basic Computed

```javascript
import { state, computed } from 'nova'

const firstName = state('Jane')
const lastName = state('Doe')

const fullName = computed(() => `${firstName.value} ${lastName.value}`)

console.log(fullName.value) // 'Jane Doe'

firstName.value = 'John'
console.log(fullName.value) // 'John Doe'
```

### Computed with Getter and Setter

```javascript
const firstName = state('Jane')
const lastName = state('Doe')

const fullName = computed({
  get() {
    return `${firstName.value} ${lastName.value}`
  },
  set(value) {
    const parts = value.split(' ')
    firstName.value = parts[0]
    lastName.value = parts[1] || ''
  },
})

fullName.value = 'John Smith'
console.log(firstName.value) // 'John'
console.log(lastName.value) // 'Smith'
```

### Computed in Components

```javascript
import { component, html, state, computed } from 'nova'

export default component({
  name: 'PriceCalculator',

  setup() {
    const price = state(100)
    const taxRate = state(0.08)
    const quantity = state(1)

    const subtotal = computed(() => price.value * quantity.value)
    const tax = computed(() => subtotal.value * taxRate.value)
    const total = computed(() => subtotal.value + tax.value)

    return { price, taxRate, quantity, subtotal, tax, total }
  },

  render({ price, taxRate, quantity, subtotal, tax, total }) {
    return html`
      <div class="calculator">
        <label>
          Price: <input type="number" .value=${price.value} @input=${e => price.value = Number(e.target.value)} />
        </label>
        <label>
          Quantity: <input type="number" .value=${quantity.value} @input=${e => quantity.value = Number(e.target.value)} />
        </label>
        <p>Subtotal: $${subtotal.value.toFixed(2)}</p>
        <p>Tax: $${tax.value.toFixed(2)}</p>
        <p><strong>Total: $${total.value.toFixed(2)}</strong></p>
      </div>
    `
  },
})
```

## Stores

Stores are the recommended way to manage shared state across your application. A store is a plain JavaScript object wrapped with reactive state and optional computed values.

### Creating a Store

```javascript
// src/stores/counter.js
import { createStore } from 'nova'

export const useCounterStore = createStore('counter', ({ state, computed, watch }) => {
  const count = state(0)
  const history = state([])

  const isPositive = computed(() => count.value > 0)
  const isNegative = computed(() => count.value < 0)

  function increment() {
    count.value++
    history.value.push({ type: 'increment', at: Date.now() })
  }

  function decrement() {
    count.value--
    history.value.push({ type: 'decrement', at: Date.now() })
  }

  function reset() {
    count.value = 0
    history.value = []
  }

  watch(count, (newVal, oldVal) => {
    console.log(`Count changed: ${oldVal} → ${newVal}`)
  })

  return {
    count,
    history,
    isPositive,
    isNegative,
    increment,
    decrement,
    reset,
  }
})
```

### Using a Store in Components

```javascript
import { component, html } from 'nova'
import { useCounterStore } from '@stores/counter'

export default component({
  name: 'CounterDisplay',

  setup() {
    const counter = useCounterStore()
    return { counter }
  },

  render({ counter }) {
    return html`
      <div>
        <p>Count: ${counter.count.value}</p>
        <button @click=${counter.increment}>+</button>
        <button @click=${counter.decrement}>-</button>
        <button @click=${counter.reset}>Reset</button>
      </div>
    `
  },
})
```

### Store with Async Actions

```javascript
// src/stores/users.js
import { createStore } from 'nova'

export const useUserStore = createStore('users', ({ state, computed }) => {
  const users = state([])
  const loading = state(false)
  const error = state(null)

  const userCount = computed(() => users.value.length)
  const activeUsers = computed(() => users.value.filter(u => u.active))

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      users.value = data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function createUser(userData) {
    loading.value = true
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const newUser = await response.json()
      users.value.push(newUser)
      return newUser
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    loading,
    error,
    userCount,
    activeUsers,
    fetchUsers,
    createUser,
  }
})
```

## Watchers

Watch reactive values and perform side effects when they change.

### Basic Watch

```javascript
import { state, watch } from 'nova'

const searchTerm = state('')

watch(searchTerm, (newValue, oldValue) => {
  console.log(`Search changed from "${oldValue}" to "${newValue}"`)
  // Debounced API call would go here
})
```

### Watch with Options

```javascript
watch(
  searchTerm,
  (newValue) => {
    performSearch(newValue)
  },
  {
    immediate: true,   // Run the callback immediately with the current value
    debounce: 300,     // Wait 300ms after the last change before running
  }
)
```

### Watching Multiple Sources

```javascript
const firstName = state('')
const lastName = state('')

watch(
  [firstName, lastName],
  ([first, last]) => {
    console.log(`Name: ${first} ${last}`)
  }
)
```

### Watch Effect

`watchEffect` automatically tracks dependencies and re-runs when any of them change:

```javascript
import { state, watchEffect } from 'nova'

const userId = state(1)
const posts = state([])

watchEffect(async () => {
  const id = userId.value
  const response = await fetch(`/api/users/${id}/posts`)
  posts.value = await response.json()
})
```

## State Architecture Patterns

### Module Stores

Group related state into separate store modules:

```
src/stores/
├── auth.js      # Authentication state
├── cart.js      # Shopping cart state
├── ui.js        # UI state (modals, toasts, theme)
└── users.js     # User data
```

### Cross-Store Communication

```javascript
// Stores can reference other stores
import { useAuthStore } from './auth'
import { useCartStore } from './cart'

export const useCheckoutStore = createStore('checkout', () => {
  const auth = useAuthStore()
  const cart = useCartStore()

  async function checkout() {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: cart.items.value }),
    })
    return response.json()
  }

  return { checkout }
})
```