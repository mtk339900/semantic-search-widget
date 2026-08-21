# Authentication

Nova.js provides built-in support for authentication workflows including credential-based login, token management, session persistence, and third-party OAuth providers. This guide walks through implementing secure authentication in your application.

## Authentication Overview

Nova.js authentication is built on a layered security model:

1. **Transport layer** — HTTPS for all authenticated requests
2. **Token layer** — JWT tokens for stateless authentication
3. **Session layer** — Server-side sessions for sensitive operations
4. **Application layer** — Route guards and middleware for access control

The framework ships with `@nova-js/auth`, a core plugin that handles the common authentication patterns so you don't have to build them from scratch.

## Setting Up Authentication

### Installing the Auth Plugin

```bash
npm install @nova-js/auth
```

Register the plugin in your configuration:

```javascript
// nova.config.js
import novaAuth from '@nova-js/auth'

export default {
  plugins: [
    novaAuth({
      // Authentication provider configuration
      providers: {
        credentials: {
          enabled: true,
          endpoints: {
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            signup: '/api/auth/signup',
            refresh: '/api/auth/refresh',
          },
        },
      },

      // Session management
      session: {
        strategy: 'jwt',       // 'jwt' | 'cookie' | 'hybrid'
        maxAge: 7 * 24 * 3600, // 7 days in seconds
        slidingWindow: true,    // Extend session on activity
      },

      // Token configuration
      token: {
        accessToken: {
          expiresIn: '15m',
          secret: process.env.NOVA_AUTH_SECRET,
        },
        refreshToken: {
          expiresIn: '7d',
          secret: process.env.NOVA_AUTH_REFRESH_SECRET,
        },
      },
    }),
  ],
}
```

### Environment Variables

Set these in your `.env` file:

```bash
NOVA_AUTH_SECRET=your-256-bit-secret-key-here
NOVA_AUTH_REFRESH_SECRET=your-refresh-secret-key-here
NOVA_AUTH_COOKIE_DOMAIN=.yourapp.com
NOVA_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

## Credential-Based Login

### Login Form Component

```javascript
import { component, html, state, useAuth } from 'nova'

export default component({
  name: 'LoginForm',

  setup() {
    const auth = useAuth()
    const email = state('')
    const password = state('')
    const rememberMe = state(false)
    const errors = state({})
    const isSubmitting = state(false)

    async function handleSubmit(e) {
      e.preventDefault()
      isSubmitting.value = true
      errors.value = {}

      try {
        await auth.login({
          email: email.value,
          password: password.value,
          rememberMe: rememberMe.value,
        })
        // Redirect happens automatically based on config
      } catch (err) {
        if (err.field) {
          errors.value[err.field] = err.message
        } else {
          errors.value.form = 'Invalid email or password. Please try again.'
        }
      } finally {
        isSubmitting.value = false
      }
    }

    return { email, password, rememberMe, errors, isSubmitting, handleSubmit }
  },

  render({ email, password, rememberMe, errors, isSubmitting, handleSubmit }) {
    return html`
      <form @submit=${handleSubmit} class="login-form">
        <h2>Sign In</h2>

        ${errors.value.form && html`<div class="error-banner">${errors.value.form}</div>`}

        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            type="email"
            .value=${email.value}
            @input=${e => email.value = e.target.value}
            required
            autocomplete="email"
          />
          ${errors.value.email && html`<span class="field-error">${errors.value.email}</span>`}
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            .value=${password.value}
            @input=${e => password.value = e.target.value}
            required
            autocomplete="current-password"
          />
          ${errors.value.password && html`<span class="field-error">${errors.value.password}</span>`}
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" .checked=${rememberMe.value} @change=${e => rememberMe.value = e.target.checked} />
            Remember me for 30 days
          </label>
        </div>

        <button type="submit" ?disabled=${isSubmitting.value}>
          ${isSubmitting.value ? 'Signing in...' : 'Sign In'}
        </button>

        <p class="alt-action">
          Don't have an account? <a href="/signup">Create one</a>
        </p>
      </form>
    `
  },
})
```

## User Registration

### Sign Up Flow

```javascript
import { component, html, state, useAuth } from 'nova'

export default component({
  name: 'SignupForm',

  setup() {
    const auth = useAuth()
    const form = state({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    })
    const errors = state({})
    const step = state(1) // Multi-step form

    async function handleSignup(e) {
      e.preventDefault()
      errors.value = {}

      if (form.value.password !== form.value.confirmPassword) {
        errors.value.confirmPassword = 'Passwords do not match'
        return
      }

      try {
        await auth.signup({
          name: form.value.name,
          email: form.value.email,
          password: form.value.password,
        })
        // On success, redirect to email verification or dashboard
      } catch (err) {
        if (err.code === 'EMAIL_TAKEN') {
          errors.value.email = 'An account with this email already exists'
        } else {
          errors.value.form = 'Registration failed. Please try again later.'
        }
      }
    }

    return { form, errors, step, handleSignup }
  },

  render({ form, errors, handleSignup }) {
    return html`
      <form @submit=${handleSignup} class="signup-form">
        <h2>Create Your Account</h2>

        <div class="form-group">
          <label for="name">Full Name</label>
          <input id="name" type="text" .value=${form.value.name}
            @input=${e => form.value.name = e.target.value} required />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" .value=${form.value.email}
            @input=${e => form.value.email = e.target.value} required />
          ${errors.value.email && html`<span class="field-error">${errors.value.email}</span>`}
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" type="password" .value=${form.value.password}
            @input=${e => form.value.password = e.target.value}
            minlength="8" required />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" type="password" .value=${form.value.confirmPassword}
            @input=${e => form.value.confirmPassword = e.target.value} required />
          ${errors.value.confirmPassword && html`<span class="field-error">${errors.value.confirmPassword}</span>`}
        </div>

        <button type="submit">Create Account</button>
      </form>
    `
  },
})
```

## JWT Token Management

### Token Storage and Refresh

The `@nova-js/auth` plugin automatically handles token storage and refresh:

```javascript
import { useAuth } from 'nova'

const auth = useAuth()

// Access current tokens (read-only)
console.log(auth.accessToken)     // The current JWT access token
console.log(auth.refreshToken)    // The refresh token
console.log(auth.isAuthenticated) // Boolean: is user logged in?
console.log(auth.user)            // Decoded user payload from JWT
```

### Token Refresh Flow

When an access token expires, the plugin automatically:

1. Intercepts the 401 response
2. Uses the refresh token to obtain a new access token
3. Retries the original request with the new token
4. If the refresh token is also expired, redirects to the login page

Configure the refresh behavior:

```javascript
novaAuth({
  token: {
    refreshBeforeExpiry: 5 * 60, // Refresh 5 minutes before expiry
    maxRefreshAttempts: 3,
    onRefreshFailure: () => {
      // Called when refresh token is also invalid
      navigate('/login?reason=session_expired')
    },
  },
})
```

### Custom Token Storage

By default, tokens are stored in memory (with an optional localStorage backup). For enhanced security, use a custom storage backend:

```javascript
import novaAuth from '@nova-js/auth'

novaAuth({
  token: {
    storage: {
      get(key) {
        // Use HttpOnly cookies instead of localStorage
        return document.cookie
          .split('; ')
          .find(row => row.startsWith(`${key}=`))
          ?.split('=')[1]
      },
      set(key, value, options) {
        document.cookie = `${key}=${value}; path=/; secure; samesite=strict; max-age=${options.maxAge}`
      },
      remove(key) {
        document.cookie = `${key}=; path=/; max-age=0`
      },
    },
  },
})
```

## OAuth Integration

### Configuring OAuth Providers

Nova.js supports Google, GitHub, Facebook, Twitter, and any OIDC-compliant provider:

```javascript
// nova.config.js
import novaAuth from '@nova-js/auth'

export default {
  plugins: [
    novaAuth({
      providers: {
        google: {
          clientId: process.env.NOVA_GOOGLE_CLIENT_ID,
          clientSecret: process.env.NOVA_GOOGLE_CLIENT_SECRET,
          scopes: ['openid', 'email', 'profile'],
        },
        github: {
          clientId: process.env.NOVA_GITHUB_CLIENT_ID,
          clientSecret: process.env.NOVA_GITHUB_CLIENT_SECRET,
          scopes: ['user:email'],
        },
      },
    }),
  ],
}
```

### OAuth Login Buttons

```javascript
import { component, html, useAuth } from 'nova'

export default component({
  name: 'SocialLogin',

  setup() {
    const auth = useAuth()
    return { auth }
  },

  render({ auth }) {
    return html`
      <div class="social-login">
        <button @click=${() => auth.loginWith('google')} class="btn-google">
          Continue with Google
        </button>
        <button @click=${() => auth.loginWith('github')} class="btn-github">
          Continue with GitHub
        </button>
      </div>
    `
  },
})
```

### OAuth Callback Handler

Create a callback route to handle the OAuth redirect:

```javascript
// src/routes/auth/callback.js
import { useAuth } from 'nova'
import { redirect } from 'nova'

export async function loader({ request }) {
  const auth = useAuth()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')

  if (!code || !stateParam) {
    redirect('/login?error=oauth_failed')
  }

  try {
    await auth.handleOAuthCallback({ code, state: stateParam, provider: 'google' })
    redirect('/dashboard')
  } catch (error) {
    redirect('/login?error=oauth_failed')
  }
}
```

## Session Management

### Accessing the Current Session

```javascript
import { useAuth } from 'nova'

const auth = useAuth()

// Reactive session object
const user = auth.user
const isAuthenticated = auth.isAuthenticated

// Check specific permissions
const isAdmin = computed(() => auth.user.value?.role === 'admin')
```

### Session Expiry Handling

```javascript
// Listen for session events
auth.on('sessionExpired', () => {
  showToast('Your session has expired. Please sign in again.')
  navigate('/login')
})

auth.on('tokenRefreshed', (newToken) => {
  console.log('Token was silently refreshed')
})
```

### Manual Logout

```javascript
async function handleLogout() {
  await auth.logout()
  // Clears tokens, session data, and redirects to login
  navigate('/login')
}
```

## Route Protection

### Per-Route Auth Guards

```javascript
// src/routes/admin/layout.js
export const guard = async ({ auth }) => {
  if (!auth.isAuthenticated) {
    return { redirect: '/login?from=/admin' }
  }
  if (auth.user.role !== 'admin') {
    return { redirect: '/unauthorized' }
  }
  return { allow: true }
}
```

### Role-Based Access Control

```javascript
export const guard = async ({ auth, params }) => {
  const requiredRole = 'editor'
  if (!auth.hasRole(requiredRole)) {
    return { redirect: `/unauthorized?required=${requiredRole}` }
  }
  return { allow: true }
}
```