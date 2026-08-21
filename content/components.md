# Components

Components are the building blocks of any Nova.js application. They encapsulate structure, style, and behavior into reusable, self-contained units. This guide covers component creation, props, slots, lifecycle hooks, and composition patterns.

## Creating Components

The `component()` function is the primary way to define a component in Nova.js. It accepts a configuration object with lifecycle hooks and a render function.

### Basic Component

```javascript
import { component, html } from 'nova'

export default component({
  name: 'Greeting',

  render() {
    return html`
      <div class="greeting">
        <h2>Hello, World!</h2>
      </div>
    `
  },
})
```

### Component with Setup

The `setup()` function runs once when the component is created. Return an object to expose values to the template:

```javascript
import { component, html, state, computed } from 'nova'

export default component({
  name: 'Counter',

  setup() {
    const count = state(0)
    const doubled = computed(() => count.value * 2)

    function increment() {
      count.value++
    }

    return { count, doubled, increment }
  },

  render({ count, doubled, increment }) {
    return html`
      <div>
        <p>Count: ${count.value}</p>
        <p>Doubled: ${doubled.value}</p>
        <button @click=${increment}>+1</button>
      </div>
    `
  },
})
```

## Props

Props let parent components pass data to child components. Declare expected props for type checking and documentation.

### Declaring Props

```javascript
import { component, html } from 'nova'

export default component({
  name: 'UserCard',

  props: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    avatar: { type: String, default: null },
    role: { type: String, validator: (v) => ['admin', 'user', 'guest'].includes(v) },
  },

  render({ name, email, avatar, role }) {
    return html`
      <div class="user-card">
        <img src=${avatar || '/default-avatar.png'} alt=${name} />
        <h3>${name}</h3>
        <p>${email}</p>
        <span class="badge">${role}</span>
      </div>
    `
  },
})
```

### Passing Props

```javascript
import UserCard from './UserCard'

export default component({
  name: 'UserList',

  render() {
    const users = [
      { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob', email: 'bob@example.com', role: 'user' },
    ]

    return html`
      <div class="user-list">
        ${users.map(user => html`
          <${UserCard}
            name=${user.name}
            email=${user.email}
            role=${user.role}
          />
        `)}
      </div>
    `
  },
})
```

### Prop Mutation Warning

Props are read-only. Attempting to modify a prop triggers a warning in development mode. If you need to transform prop data, use a local state variable:

```javascript
setup({ initialCount }) {
  const count = state(initialCount)
  return { count }
}
```

## Slots

Slots let you compose components with flexible content distribution. They're similar to "children" in React or "slots" in Vue.

### Default Slot

```javascript
// Card.js
export default component({
  name: 'Card',

  props: {
    title: String,
  },

  render({ title, slots }) {
    return html`
      <div class="card">
        <h3 class="card-title">${title}</h3>
        <div class="card-body">
          <${slots.default} />
        </div>
      </div>
    `
  },
})

// Usage
export default component({
  name: 'App',
  render() {
    return html`
      <${Card} title="Welcome">
        <p>This content goes into the default slot.</p>
      <//>
    `
  },
})
```

### Named Slots

```javascript
export default component({
  name: 'PageLayout',

  render({ slots }) {
    return html`
      <div class="page">
        <header>
          <${slots.header} />
        </header>
        <main>
          <${slots.default} />
        </main>
        <footer>
          <${slots.footer} />
        </footer>
      </div>
    `
  },
})
```

Usage with named slots:

```javascript
export default component({
  name: 'App',
  render() {
    return html`
      <${PageLayout}>
        <${'header'}>Site Header<//>
        <p>Main content here.</p>
        <${'footer'}>© 2024 My App<//>
      <//>
    `
  },
})
```

### Scoped Slots

Scoped slots pass data from the child component back to the parent:

```javascript
// DataList.js
export default component({
  name: 'DataList',

  props: {
    items: { type: Array, required: true },
  },

  render({ items, slots }) {
    return html`
      <ul>
        ${items.map((item, index) => html`
          <li>
            <${slots.default} item=${item} index=${index} />
          </li>
        `)}
      </ul>
    `
  },
})
```

## Lifecycle Hooks

Nova.js components go through a well-defined lifecycle. Hook into these stages to run code at the right time.

### Available Hooks

```javascript
import { component, html, onMount, onUpdate, onDestroy, onBeforeMount } from 'nova'

export default component({
  name: 'LifecycleDemo',

  setup() {
    onBeforeMount(() => {
      console.log('Component is about to mount')
    })

    onMount(() => {
      console.log('Component is mounted in the DOM')
      // Good place for:
      // - DOM measurements
      // - API calls
      // - Event listener registration
    })

    onUpdate((prevProps) => {
      console.log('Component updated', prevProps)
    })

    onDestroy(() => {
      console.log('Component is being removed')
      // Clean up:
      // - Event listeners
      // - Timers
      // - Subscriptions
    })

    return {}
  },

  render() {
    return html`<div>Lifecycle Demo</div>`
  },
})
```

### Cleanup Patterns

Always clean up side effects to prevent memory leaks:

```javascript
setup() {
  const intervalId = setInterval(() => {
    console.log('tick')
  }, 1000)

  const handleResize = () => {
    console.log('window resized')
  }
  window.addEventListener('resize', handleResize)

  onDestroy(() => {
    clearInterval(intervalId)
    window.removeEventListener('resize', handleResize)
  })
}
```

## Events

Child components communicate with parents through custom events.

### Emitting Events

```javascript
import { component, html, emit } from 'nova'

export default component({
  name: 'SearchInput',

  setup() {
    const query = state('')

    function handleInput(e) {
      query.value = e.target.value
      emit('search', query.value)
    }

    function handleClear() {
      query.value = ''
      emit('search', '')
      emit('cleared')
    }

    return { query, handleInput, handleClear }
  },

  render({ query, handleInput, handleClear }) {
    return html`
      <div class="search-input">
        <input
          type="text"
          value=${query.value}
          @input=${handleInput}
          placeholder="Search..."
        />
        <button @click=${handleClear}>Clear</button>
      </div>
    `
  },
})
```

### Listening to Events

```javascript
export default component({
  name: 'App',
  render() {
    function onSearch(query) {
      console.log('Search query:', query)
    }

    function onCleared() {
      console.log('Search cleared')
    }

    return html`
      <${SearchInput}
        @search=${onSearch}
        @cleared=${onCleared}
      />
    `
  },
})
```

## Component Composition

### Provide and Inject

Share data across deeply nested component trees without prop drilling:

```javascript
import { provide, inject } from 'nova'

// Parent component
export default component({
  name: 'ThemeProvider',
  setup() {
    const theme = state('dark')
    provide('theme', theme)
    return { theme }
  },
  render({ slots }) {
    return html`<${slots.default} />`
  },
})

// Deep descendant
export default component({
  name: 'ThemedButton',
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  render({ theme }) {
    return html`
      <button class=${`btn btn-${theme.value}`}>Click me</button>
    `
  },
})
```

### Dynamic Components

Render different components based on runtime conditions:

```javascript
import { component, html, resolveComponent } from 'nova'

export default component({
  name: 'DynamicRenderer',

  props: {
    type: { type: String, required: true },
  },

  render({ type }) {
    const Target = resolveComponent(type)
    return Target
      ? html`<${Target} />`
      : html`<p>Unknown component: ${type}</p>`
  },
})
```

## Component Best Practices

1. **Keep components focused** — Each component should do one thing well. If it's growing beyond 200 lines, consider splitting it.
2. **Use composition over inheritance** — Nova.js doesn't support component inheritance. Use composition, slots, and provide/inject instead.
3. **Declare all props** — Even if you don't need type checking in development, prop declarations serve as documentation.
4. **Avoid deeply nested ternaries in templates** — Extract complex conditional rendering into separate components or use computed values.